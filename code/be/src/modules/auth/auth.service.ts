import { randomUUID } from 'node:crypto';

import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvironmentVariables } from '../../config/environment';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import { activityEvents } from '../../database/schema';
import { IdempotencyService } from '../idempotency';
import { OutboxService } from '../outbox';
import { AuthRepository } from './auth.repository';
import type {
  AuthRequestMetadata,
  AuthTokens,
  AuthUser,
  PasswordAccount,
  SessionView,
} from './auth.types';
import type {
  ChangePasswordDto,
  ForgotPasswordDto,
  RefreshDto,
  RegisterDto,
  ResetPasswordDto,
  SignInDto,
} from './dto';
import { PasswordHasher } from './password-hasher';
import { AccessTokenService, OpaqueTokenService } from './token.service';

type AuthAttempt<T> = { ok: true; value: T } | { ok: false };

@Injectable()
export class AuthService {
  private readonly refreshTtlMilliseconds: number;
  private readonly resetTtlMilliseconds: number;

  constructor(
    private readonly database: DatabaseService,
    private readonly repository: AuthRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly opaqueTokens: OpaqueTokenService,
    private readonly accessTokens: AccessTokenService,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
    config: ConfigService<EnvironmentVariables, true>,
  ) {
    this.refreshTtlMilliseconds =
      config.getOrThrow('REFRESH_TOKEN_TTL_SECONDS') * 1_000;
    this.resetTtlMilliseconds =
      config.getOrThrow('PASSWORD_RESET_TTL_SECONDS') * 1_000;
  }

  register(
    idempotencyKey: string,
    dto: RegisterDto,
    metadata: AuthRequestMetadata,
  ): Promise<AuthTokens> {
    return this.idempotency.execute(
      {
        actor: { kind: 'email', subject: dto.email },
        key: idempotencyKey,
        request: dto,
        responseStatus: 201,
        routeScope: 'auth:register',
      },
      async (transaction) => {
        if (
          await this.repository.findPasswordAccountByEmail(
            dto.email,
            transaction,
          )
        ) {
          throw new ConflictException(
            'An account with this email already exists.',
          );
        }

        const passwordHash = await this.passwordHasher.hash(dto.password);
        let user: AuthUser;
        try {
          user = await this.repository.createPasswordAccount(transaction, {
            email: dto.email,
            passwordHash,
            displayName: dto.displayName,
            timezone: dto.timezone,
          });
        } catch (error) {
          if (isUniqueViolation(error)) {
            throw new ConflictException(
              'An account with this email already exists.',
            );
          }
          throw error;
        }

        await this.recordSecurityEvent(transaction, user.id, 'USER_REGISTERED');
        return this.issueSession(transaction, user, metadata);
      },
    );
  }

  signIn(
    idempotencyKey: string,
    dto: SignInDto,
    metadata: AuthRequestMetadata,
  ): Promise<AuthTokens> {
    return this.idempotency.execute(
      {
        actor: { kind: 'email', subject: dto.email },
        key: idempotencyKey,
        request: dto,
        responseStatus: 200,
        routeScope: 'auth:sign-in',
        authorizeReplay: async (transaction) => {
          await this.requireValidCredentials(dto, transaction);
        },
      },
      async (transaction) => {
        const account = await this.requireValidCredentials(dto, transaction);
        const tokens = await this.issueSession(transaction, account, metadata);
        await this.recordSecurityEvent(
          transaction,
          account.id,
          'USER_SIGNED_IN',
          {
            sessionId: tokens.sessionId,
          },
        );
        return tokens;
      },
    );
  }

  async refresh(
    idempotencyKey: string,
    dto: RefreshDto,
    metadata: AuthRequestMetadata,
  ): Promise<AuthTokens> {
    const tokenHash = this.opaqueTokens.hash(dto.refreshToken);
    const attempt = await this.idempotency.execute<
      RefreshDto,
      AuthAttempt<AuthTokens>
    >(
      {
        actor: { kind: 'refresh-token', subject: tokenHash },
        key: idempotencyKey,
        request: dto,
        responseStatus: 200,
        routeScope: 'auth:refresh',
      },
      async (transaction) => {
        const initial = await this.repository.findRefreshSessionByHash(
          tokenHash,
          transaction,
        );
        if (!initial) {
          return { ok: false };
        }

        await this.repository.lockRefreshFamily(transaction, initial.familyId);
        const session = await this.repository.findRefreshSessionByHash(
          tokenHash,
          transaction,
          true,
        );
        if (!session) {
          return { ok: false };
        }

        const child = await this.repository.findRefreshChild(
          transaction,
          session.id,
        );
        if (session.consumedAt || child) {
          await this.repository.revokeRefreshFamily(
            transaction,
            session.familyId,
            session.userId,
            'TOKEN_REUSE',
          );
          return { ok: false };
        }
        if (session.revokedAt || session.expiresAt <= new Date()) {
          return { ok: false };
        }

        const user = await this.repository.findActiveAuthUserById(
          session.userId,
          transaction,
        );
        if (!user) {
          return { ok: false };
        }

        await this.repository.consumeRefreshSession(
          transaction,
          session.id,
          new Date(),
        );
        const tokens = await this.issueSession(transaction, user, metadata, {
          familyId: session.familyId,
          rotatedFromSessionId: session.id,
        });
        return { ok: true, value: tokens };
      },
    );

    if (!attempt.ok) {
      throw new UnauthorizedException('Refresh token is invalid or expired.');
    }
    return attempt.value;
  }

  signOut(
    userId: string,
    sessionId: string,
    idempotencyKey: string,
  ): Promise<{ signedOut: true }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { sessionId },
        responseStatus: 200,
        routeScope: 'auth:sign-out',
      },
      async (transaction) => {
        const session = await this.repository.findRefreshSessionById(
          sessionId,
          transaction,
        );
        if (session?.userId === userId) {
          await this.repository.revokeRefreshFamily(
            transaction,
            session.familyId,
            userId,
            'SIGNED_OUT',
          );
        }
        return { signedOut: true };
      },
    );
  }

  async listSessions(
    userId: string,
    currentSessionId: string,
  ): Promise<SessionView[]> {
    const sessions = await this.repository.listUserRefreshSessions(userId);
    return sessions.map((session) => ({
      id: session.id,
      current: session.id === currentSessionId,
      deviceName: session.deviceName,
      userAgent: session.userAgent,
      createdAt: session.createdAt.toISOString(),
      lastUsedAt: session.lastUsedAt?.toISOString() ?? null,
      consumedAt: session.consumedAt?.toISOString() ?? null,
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString() ?? null,
    }));
  }

  revokeSession(
    userId: string,
    sessionId: string,
    idempotencyKey: string,
  ): Promise<{ revoked: true }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { sessionId },
        responseStatus: 200,
        routeScope: 'auth:sessions:revoke',
      },
      async (transaction) => {
        const session = await this.repository.findRefreshSessionById(
          sessionId,
          transaction,
        );
        if (session?.userId === userId) {
          await this.repository.revokeRefreshFamily(
            transaction,
            session.familyId,
            userId,
            'DEVICE_REVOKED',
          );
        }
        return { revoked: true };
      },
    );
  }

  revokeOtherSessions(
    userId: string,
    currentSessionId: string,
    idempotencyKey: string,
  ): Promise<{ revoked: true }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { currentSessionId },
        responseStatus: 200,
        routeScope: 'auth:sessions:revoke-others',
      },
      async (transaction) => {
        await this.repository.revokeOtherUserSessions(
          transaction,
          userId,
          currentSessionId,
        );
        return { revoked: true };
      },
    );
  }

  forgotPassword(
    idempotencyKey: string,
    dto: ForgotPasswordDto,
    metadata: AuthRequestMetadata,
  ): Promise<{ accepted: true }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'email', subject: dto.email },
        key: idempotencyKey,
        request: dto,
        responseStatus: 202,
        routeScope: 'auth:password:forgot',
      },
      async (transaction) => {
        const account = await this.repository.findPasswordAccountByEmail(
          dto.email,
          transaction,
        );
        if (account?.status === 'ACTIVE') {
          await this.repository.invalidatePasswordResetTokens(
            transaction,
            account.id,
          );
          const token = this.opaqueTokens.generate();
          await this.repository.insertPasswordResetToken(transaction, {
            id: randomUUID(),
            userId: account.id,
            tokenHash: this.opaqueTokens.hash(token),
            requestedIp: metadata.ipAddress,
            expiresAt: new Date(Date.now() + this.resetTtlMilliseconds),
          });
          await this.outbox.enqueue(transaction, {
            eventType: 'auth.password_reset_requested',
            aggregateType: 'user',
            aggregateId: account.id,
            payload: { resetToken: token },
          });
        }
        return { accepted: true };
      },
    );
  }

  async resetPassword(
    idempotencyKey: string,
    dto: ResetPasswordDto,
  ): Promise<{ changed: true }> {
    const tokenHash = this.opaqueTokens.hash(dto.token);
    const attempt = await this.idempotency.execute<
      ResetPasswordDto,
      AuthAttempt<{ changed: true }>
    >(
      {
        actor: { kind: 'reset-token', subject: tokenHash },
        key: idempotencyKey,
        request: dto,
        responseStatus: 200,
        routeScope: 'auth:password:reset',
      },
      async (transaction) => {
        const reset = await this.repository.findPasswordResetByHash(
          transaction,
          tokenHash,
        );
        if (
          !reset ||
          reset.usedAt ||
          reset.invalidatedAt ||
          reset.expiresAt <= new Date()
        ) {
          return { ok: false };
        }
        const user = await this.repository.findActiveAuthUserById(
          reset.userId,
          transaction,
        );
        if (!user) {
          return { ok: false };
        }

        const passwordHash = await this.passwordHasher.hash(dto.newPassword);
        await this.repository.updatePasswordHash(
          transaction,
          user.id,
          passwordHash,
        );
        await this.repository.consumePasswordReset(transaction, reset.id);
        await this.repository.invalidatePasswordResetTokens(
          transaction,
          user.id,
        );
        await this.repository.revokeAllUserSessions(transaction, user.id);
        await this.recordSecurityEvent(transaction, user.id, 'PASSWORD_RESET');
        return { ok: true, value: { changed: true } };
      },
    );

    if (!attempt.ok) {
      throw new BadRequestException(
        'Password reset token is invalid or expired.',
      );
    }
    return attempt.value;
  }

  changePassword(
    userId: string,
    idempotencyKey: string,
    dto: ChangePasswordDto,
  ): Promise<{ changed: true }> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: dto,
        responseStatus: 200,
        routeScope: 'auth:password:change',
      },
      async (transaction) => {
        const user = await this.repository.findActiveAuthUserById(
          userId,
          transaction,
        );
        const account = user
          ? await this.repository.findPasswordAccountByEmail(
              user.email,
              transaction,
            )
          : undefined;
        if (
          !account ||
          !(await this.passwordHasher.verify(
            dto.currentPassword,
            account.passwordHash,
          ))
        ) {
          throw new UnauthorizedException('Current password is incorrect.');
        }
        const passwordHash = await this.passwordHasher.hash(dto.newPassword);
        await this.repository.updatePasswordHash(
          transaction,
          userId,
          passwordHash,
        );
        await this.repository.revokeAllUserSessions(transaction, userId);
        await this.recordSecurityEvent(transaction, userId, 'PASSWORD_CHANGED');
        return { changed: true };
      },
    );
  }

  private async requireValidCredentials(
    dto: Pick<SignInDto, 'email' | 'password'>,
    transaction: DatabaseTransaction,
  ): Promise<PasswordAccount> {
    const account = await this.repository.findPasswordAccountByEmail(
      dto.email,
      transaction,
    );
    const valid = await this.passwordHasher.verify(
      dto.password,
      account?.passwordHash,
    );
    if (!valid || account?.status !== 'ACTIVE') {
      throw new UnauthorizedException('Email or password is incorrect.');
    }
    return account;
  }

  private async issueSession(
    transaction: DatabaseTransaction,
    user: AuthUser,
    metadata: AuthRequestMetadata,
    lineage?: { familyId: string; rotatedFromSessionId: string },
  ): Promise<AuthTokens> {
    const sessionId = randomUUID();
    const refreshToken = this.opaqueTokens.generate();
    const refreshTokenExpiresAt = new Date(
      Date.now() + this.refreshTtlMilliseconds,
    );
    await this.repository.insertRefreshSession(transaction, {
      id: sessionId,
      userId: user.id,
      tokenHash: this.opaqueTokens.hash(refreshToken),
      familyId: lineage?.familyId ?? randomUUID(),
      rotatedFromSessionId: lineage?.rotatedFromSessionId,
      deviceName: metadata.deviceName,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiresAt: refreshTokenExpiresAt,
    });
    const access = await this.accessTokens.issue(user.id, sessionId);
    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
      sessionId,
      user,
    };
  }

  private async recordSecurityEvent(
    transaction: DatabaseTransaction,
    userId: string,
    eventType: string,
    payload: Record<string, unknown> = {},
  ): Promise<void> {
    await transaction.insert(activityEvents).values({
      actorUserId: userId,
      eventType,
      aggregateType: 'USER',
      aggregateId: userId,
      payload,
    });
    await this.outbox.enqueue(transaction, {
      eventType: `auth.${eventType.toLowerCase()}`,
      aggregateType: 'user',
      aggregateId: userId,
      payload,
    });
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  );
}
