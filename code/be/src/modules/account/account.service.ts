import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PasswordHasher } from '../auth/password-hasher';
import { IdempotencyCrypto, IdempotencyService } from '../idempotency';
import type {
  AccountDeletionResultDto,
  AccountExportDto,
  DeleteAccountDto,
} from './account.dto';
import { AccountRepository } from './account.repository';

@Injectable()
export class AccountService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly idempotency: IdempotencyService,
    private readonly idempotencyCrypto: IdempotencyCrypto,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  exportAccount(userId: string): Promise<AccountExportDto> {
    return this.repository.exportAccount(userId);
  }

  deleteAccount(
    userId: string,
    idempotencyKey: string,
    dto: DeleteAccountDto,
  ): Promise<AccountDeletionResultDto> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: dto,
        responseStatus: 200,
        routeScope: 'account:delete',
      },
      async (transaction) => {
        const account = await this.repository.lockAccount(transaction, userId);
        const passwordHash =
          account?.status === 'ACTIVE' && account.passwordHash
            ? account.passwordHash
            : undefined;
        if (
          !(await this.passwordHasher.verify(dto.currentPassword, passwordHash))
        ) {
          throw new UnauthorizedException('Current password is incorrect.');
        }
        if (!account?.email) {
          throw new UnauthorizedException('Current password is incorrect.');
        }
        await this.repository.lockRelevantLedgers(transaction, userId);
        if (await this.repository.hasNonzeroBalance(transaction, userId)) {
          throw new ConflictException(
            'Settle every ledger balance before deleting your account.',
          );
        }
        if (
          await this.repository.hasActiveGroupMembership(transaction, userId)
        ) {
          throw new ConflictException(
            'Leave every active group before deleting your account.',
          );
        }
        const authActors = await this.repository.listAuthActorSubjects(
          transaction,
          userId,
        );
        const idempotencyActorFingerprints = [
          this.idempotencyCrypto.actorFingerprint({
            kind: 'email',
            subject: account.email,
          }),
          ...authActors.map((actor) =>
            this.idempotencyCrypto.actorFingerprint(actor),
          ),
        ];
        const deletedAt = await this.repository.anonymize(
          transaction,
          userId,
          idempotencyActorFingerprints,
        );
        return { status: 'ANONYMIZED' as const, deletedAt };
      },
    );
  }
}
