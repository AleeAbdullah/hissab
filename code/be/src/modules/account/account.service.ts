import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { DatabaseService } from '../../database/database.service';
import { PasswordHasher } from '../auth/password-hasher';
import { GroupsService } from '../groups';
import { IdempotencyCrypto, IdempotencyService } from '../idempotency';
import { SettlementsService } from '../settlements';
import type {
  AccountDeletionResultDto,
  AccountExportDto,
  DeleteAccountDto,
} from './account.dto';
import { AccountRepository } from './account.repository';
import { buildDeletionPlan, type DeletionPlan } from './deletion-plan';

@Injectable()
export class AccountService {
  constructor(
    private readonly repository: AccountRepository,
    private readonly idempotency: IdempotencyService,
    private readonly idempotencyCrypto: IdempotencyCrypto,
    private readonly passwordHasher: PasswordHasher,
    private readonly database: DatabaseService,
    private readonly settlements: SettlementsService,
    private readonly groups: GroupsService,
  ) {}

  getDeletionPlan(userId: string): Promise<DeletionPlan> {
    return this.buildPlan(this.database.db, userId);
  }

  private async buildPlan(
    executor: Parameters<AccountRepository['listActiveGroupsToLeave']>[0],
    userId: string,
  ): Promise<DeletionPlan> {
    return buildDeletionPlan(
      userId,
      await this.repository.listDeletionBalanceRows(executor, userId),
      await this.repository.listActiveGroupsToLeave(executor, userId),
    );
  }

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
          throw new ForbiddenException('Current password is incorrect.');
        }
        if (!account?.email) {
          throw new ForbiddenException('Current password is incorrect.');
        }
        await this.repository.lockRelevantLedgers(transaction, userId);
        if (dto.planFingerprint !== undefined) {
          // Re-plan under the ledger locks; anything that changed since review aborts the whole deletion.
          const plan = await this.buildPlan(transaction, userId);
          if (plan.fingerprint !== dto.planFingerprint) {
            throw new ConflictException({
              code: 'DELETION_PLAN_CHANGED',
              message: 'Balances or groups changed. Review them again.',
            });
          }
          const occurredAt = new Date().toISOString();
          for (const settlement of plan.settlements) {
            await this.settlements.recordSettlement(
              transaction,
              userId,
              settlement.ledgerId,
              {
                fromUserId: settlement.fromUserId,
                toUserId: settlement.toUserId,
                amountMinor: settlement.amountMinor,
                occurredAt,
              },
            );
          }
          await this.repository.checkRecordedSettlementsNow(transaction);
          for (const group of plan.groups) {
            await this.groups.leaveInTransaction(
              transaction,
              userId,
              group.groupId,
            );
          }
        }
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
