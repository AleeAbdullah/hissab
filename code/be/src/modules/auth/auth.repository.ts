import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, gt, isNull, ne, sql } from 'drizzle-orm';

import {
  type AppDatabase,
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  passwordResetTokens,
  personalLedgers,
  refreshSessions,
  notificationPreferences,
  userIdentities,
  userPreferences,
  users,
} from '../../database/schema';
import type {
  AuthUser,
  PasswordAccount,
  PasswordResetRecord,
  RefreshSessionRecord,
} from './auth.types';

type DatabaseExecutor = AppDatabase | DatabaseTransaction;

interface NewRefreshSession {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  rotatedFromSessionId?: string;
  deviceName?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly database: DatabaseService) {}

  async findPasswordAccountByEmail(
    email: string,
    transaction?: DatabaseTransaction,
  ): Promise<PasswordAccount | undefined> {
    const executor = this.executor(transaction);
    const [account] = await executor
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        displayCurrency: users.displayCurrency,
        timezone: users.timezone,
        status: users.status,
        passwordHash: userIdentities.passwordHash,
      })
      .from(users)
      .innerJoin(
        userIdentities,
        and(
          eq(userIdentities.userId, users.id),
          eq(userIdentities.provider, 'PASSWORD'),
        ),
      )
      .where(eq(users.email, email))
      .limit(1);

    if (!account?.email || !account.passwordHash) {
      return undefined;
    }

    return {
      id: account.id,
      email: account.email,
      displayName: account.displayName,
      displayCurrency: account.displayCurrency,
      timezone: account.timezone,
      passwordHash: account.passwordHash,
      status: account.status,
    };
  }

  async createPasswordAccount(
    transaction: DatabaseTransaction,
    input: {
      email: string;
      passwordHash: string;
      displayName: string;
      timezone: string;
    },
  ): Promise<AuthUser> {
    const userId = randomUUID();
    const now = new Date();
    const [user] = await transaction
      .insert(users)
      .values({
        id: userId,
        email: input.email,
        displayName: input.displayName,
        timezone: input.timezone,
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        displayCurrency: users.displayCurrency,
        timezone: users.timezone,
      });

    if (!user?.email) {
      throw new Error('User insert did not return a usable account.');
    }

    await transaction.insert(userIdentities).values({
      id: randomUUID(),
      userId,
      provider: 'PASSWORD',
      providerSubject: input.email,
      passwordHash: input.passwordHash,
      createdAt: now,
      updatedAt: now,
    });
    await transaction.insert(userPreferences).values({ userId });
    await transaction.insert(notificationPreferences).values({ userId });
    await transaction.insert(personalLedgers).values({ userId });

    return { ...user, email: user.email };
  }

  async findActiveAuthUserById(
    userId: string,
    transaction?: DatabaseTransaction,
  ): Promise<AuthUser | undefined> {
    const executor = this.executor(transaction);
    const [user] = await executor
      .select({
        id: users.id,
        email: users.email,
        displayName: users.displayName,
        displayCurrency: users.displayCurrency,
        timezone: users.timezone,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.status, 'ACTIVE')))
      .limit(1);

    return user?.email ? { ...user, email: user.email } : undefined;
  }

  async insertRefreshSession(
    transaction: DatabaseTransaction,
    input: NewRefreshSession,
  ): Promise<void> {
    await transaction.insert(refreshSessions).values({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      familyId: input.familyId,
      rotatedFromSessionId: input.rotatedFromSessionId ?? null,
      deviceName: input.deviceName ?? null,
      userAgent: input.userAgent ?? null,
      ipAddress: input.ipAddress ?? null,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    });
  }

  async findRefreshSessionByHash(
    tokenHash: string,
    transaction?: DatabaseTransaction,
    lock = false,
  ): Promise<RefreshSessionRecord | undefined> {
    const executor = this.executor(transaction);
    const query = executor
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.tokenHash, tokenHash))
      .limit(1);
    const [session] =
      lock && transaction ? await query.for('update') : await query;
    return session;
  }

  async findRefreshChild(
    transaction: DatabaseTransaction,
    parentId: string,
  ): Promise<RefreshSessionRecord | undefined> {
    const [child] = await transaction
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.rotatedFromSessionId, parentId))
      .limit(1);
    return child;
  }

  async lockRefreshFamily(
    transaction: DatabaseTransaction,
    familyId: string,
  ): Promise<void> {
    await transaction.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${familyId}, 0))`,
    );
  }

  async findRefreshFamilyRoot(
    transaction: DatabaseTransaction,
    familyId: string,
  ): Promise<RefreshSessionRecord | undefined> {
    const [root] = await transaction
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.familyId, familyId))
      .orderBy(asc(refreshSessions.createdAt))
      .limit(1);
    return root;
  }

  async consumeRefreshSession(
    transaction: DatabaseTransaction,
    sessionId: string,
    usedAt: Date,
  ): Promise<void> {
    await transaction
      .update(refreshSessions)
      .set({ consumedAt: usedAt, lastUsedAt: usedAt })
      .where(
        and(
          eq(refreshSessions.id, sessionId),
          isNull(refreshSessions.consumedAt),
          isNull(refreshSessions.revokedAt),
        ),
      );
  }

  async isRefreshFamilyActive(
    transaction: DatabaseTransaction,
    familyId: string,
    userId: string,
  ): Promise<boolean> {
    const [active] = await transaction
      .select({ id: refreshSessions.id })
      .from(refreshSessions)
      .where(
        and(
          eq(refreshSessions.familyId, familyId),
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.consumedAt),
          isNull(refreshSessions.revokedAt),
          gt(refreshSessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    return Boolean(active);
  }

  async revokeRefreshFamily(
    transaction: DatabaseTransaction,
    familyId: string,
    userId?: string,
    reason = 'REVOKED',
  ): Promise<void> {
    await this.lockRefreshFamily(transaction, familyId);
    await transaction
      .update(refreshSessions)
      .set({ revokedAt: new Date(), revocationReason: reason })
      .where(
        and(
          eq(refreshSessions.familyId, familyId),
          userId ? eq(refreshSessions.userId, userId) : sql`true`,
          isNull(refreshSessions.revokedAt),
        ),
      );
  }

  async revokeRefreshFamilyForReuse(familyId: string): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.revokeRefreshFamily(
        transaction,
        familyId,
        undefined,
        'TOKEN_REUSE',
      );
    });
  }

  async revokeAllUserSessions(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<void> {
    await transaction
      .update(refreshSessions)
      .set({ revokedAt: new Date(), revocationReason: 'PASSWORD_CHANGED' })
      .where(
        and(
          eq(refreshSessions.userId, userId),
          isNull(refreshSessions.revokedAt),
        ),
      );
  }

  async revokeOtherUserSessions(
    transaction: DatabaseTransaction,
    userId: string,
    currentSessionId: string,
  ): Promise<void> {
    await transaction
      .update(refreshSessions)
      .set({ revokedAt: new Date(), revocationReason: 'DEVICE_REVOKED' })
      .where(
        and(
          eq(refreshSessions.userId, userId),
          ne(refreshSessions.id, currentSessionId),
          isNull(refreshSessions.revokedAt),
        ),
      );
  }

  listUserRefreshSessions(userId: string): Promise<RefreshSessionRecord[]> {
    return this.database.db
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.userId, userId))
      .orderBy(desc(refreshSessions.createdAt));
  }

  async invalidatePasswordResetTokens(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<void> {
    await transaction
      .update(passwordResetTokens)
      .set({ invalidatedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
          isNull(passwordResetTokens.invalidatedAt),
        ),
      );
  }

  async insertPasswordResetToken(
    transaction: DatabaseTransaction,
    input: {
      id: string;
      userId: string;
      tokenHash: string;
      requestedIp?: string;
      expiresAt: Date;
    },
  ): Promise<void> {
    await transaction.insert(passwordResetTokens).values({
      id: input.id,
      userId: input.userId,
      tokenHash: input.tokenHash,
      requestedIp: input.requestedIp ?? null,
      expiresAt: input.expiresAt,
      createdAt: new Date(),
    });
  }

  async findPasswordResetByHash(
    transaction: DatabaseTransaction,
    tokenHash: string,
  ): Promise<PasswordResetRecord | undefined> {
    const [record] = await transaction
      .select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.tokenHash, tokenHash))
      .limit(1)
      .for('update');
    return record;
  }

  async consumePasswordReset(
    transaction: DatabaseTransaction,
    resetId: string,
  ): Promise<void> {
    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.id, resetId),
          isNull(passwordResetTokens.usedAt),
        ),
      );
  }

  async updatePasswordHash(
    transaction: DatabaseTransaction,
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await transaction
      .update(userIdentities)
      .set({
        passwordHash,
        passwordChangedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userIdentities.userId, userId),
          eq(userIdentities.provider, 'PASSWORD'),
        ),
      );
  }

  private executor(transaction?: DatabaseTransaction): DatabaseExecutor {
    return transaction ?? this.database.db;
  }

  async findRefreshSessionById(
    sessionId: string,
    transaction?: DatabaseTransaction,
  ): Promise<RefreshSessionRecord | undefined> {
    const executor = this.executor(transaction);
    const [session] = await executor
      .select()
      .from(refreshSessions)
      .where(eq(refreshSessions.id, sessionId))
      .limit(1);
    return session;
  }
}
