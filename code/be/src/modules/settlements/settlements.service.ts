import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  decodeOccurrenceCursor,
  encodeOccurrenceCursor,
  pageOf,
} from '../../common/cursor';
import { recordDomainChange } from '../../common/domain-change';
import { parseMinorAmount } from '../../common/minor-units';
import type { DatabaseTransaction } from '../../database/database.service';
import { IdempotencyService } from '../idempotency';
import { LedgerAccessRepository } from '../ledgers';
import { OutboxService } from '../outbox';
import type {
  CreateSettlementDto,
  ListSettlementsDto,
  ReplaceSettlementDto,
} from './dto/settlements.dto';
import {
  type SettlementPosting,
  type SettlementRevisionRow,
  type SettlementView,
  SettlementsRepository,
} from './settlements.repository';

interface PreparedSettlement {
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
  occurredAt: Date;
}

type SettlementChange = 'CREATED' | 'REPLACED' | 'DELETED';

@Injectable()
export class SettlementsService {
  constructor(
    private readonly repository: SettlementsRepository,
    private readonly ledgers: LedgerAccessRepository,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
  ) {}

  createSettlement(
    userId: string,
    ledgerId: string,
    idempotencyKey: string,
    dto: CreateSettlementDto,
  ): Promise<SettlementView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { ledgerId, ...dto },
        responseStatus: 201,
        routeScope: 'settlements:create',
      },
      async (transaction) => {
        await this.ledgers.requireWritableLedger(transaction, ledgerId, userId);
        const prepared = this.prepare(dto);
        await this.requireActiveParties(transaction, ledgerId, prepared);
        const revision = await this.repository.insertRevision(transaction, {
          ledgerId,
          createdByUserId: userId,
          ...prepared,
          status: 'ACTIVE',
          version: 1,
        });
        await this.applyEffect(transaction, userId, revision, prepared);
        await this.recordChange(transaction, userId, revision, 'CREATED');
        return this.repository.toView(revision);
      },
    );
  }

  async listSettlements(
    userId: string,
    ledgerId: string,
    query: ListSettlementsDto,
  ): Promise<{ items: SettlementView[]; nextCursor: string | null }> {
    const limit = query.limit ?? 50;
    await this.ledgers.requireJoinedMembership(ledgerId, userId);
    const rows = await this.repository.listSettlementViews(
      ledgerId,
      query.cursor ? decodeOccurrenceCursor(query.cursor, 'settlement') : null,
      limit + 1,
    );
    return pageOf(rows, limit, encodeOccurrenceCursor);
  }

  async getSettlement(
    userId: string,
    settlementId: string,
  ): Promise<SettlementView> {
    const settlement = await this.repository.findSettlementView(
      userId,
      settlementId,
    );
    if (!settlement) {
      throw new NotFoundException('Settlement not found.');
    }
    return settlement;
  }

  replaceSettlement(
    userId: string,
    rootPaymentId: string,
    idempotencyKey: string,
    dto: ReplaceSettlementDto,
  ): Promise<SettlementView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { settlementId: rootPaymentId, ...dto },
        responseStatus: 200,
        routeScope: 'settlements:replace',
      },
      async (transaction) => {
        const latest = await this.requireMutableSettlement(
          transaction,
          rootPaymentId,
          userId,
          dto.expectedVersion,
        );
        const prepared = this.prepare(dto);
        // An edit reverses the current effect, so its parties must be active too.
        await this.requireActiveParties(transaction, latest.ledgerId, latest);
        await this.requireActiveParties(transaction, latest.ledgerId, prepared);
        await this.reverseEffect(transaction, userId, latest);
        const revision = await this.repository.insertRevision(transaction, {
          rootPaymentId: latest.rootPaymentId,
          replacesPaymentId: latest.id,
          ledgerId: latest.ledgerId,
          createdByUserId: latest.createdByUserId,
          ...prepared,
          status: 'ACTIVE',
          version: latest.version + 1,
        });
        await this.applyEffect(transaction, userId, revision, prepared);
        await this.recordChange(transaction, userId, revision, 'REPLACED');
        return this.repository.toView(revision);
      },
    );
  }

  deleteSettlement(
    userId: string,
    rootPaymentId: string,
    idempotencyKey: string,
    expectedVersion: number,
  ): Promise<SettlementView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { settlementId: rootPaymentId, expectedVersion },
        responseStatus: 200,
        routeScope: 'settlements:delete',
      },
      async (transaction) => {
        const latest = await this.requireMutableSettlement(
          transaction,
          rootPaymentId,
          userId,
          expectedVersion,
        );
        await this.requireActiveParties(transaction, latest.ledgerId, latest);
        await this.reverseEffect(transaction, userId, latest);
        const revision = await this.repository.insertRevision(transaction, {
          rootPaymentId: latest.rootPaymentId,
          replacesPaymentId: latest.id,
          ledgerId: latest.ledgerId,
          createdByUserId: latest.createdByUserId,
          fromUserId: latest.fromUserId,
          toUserId: latest.toUserId,
          amountMinor: latest.amountMinor,
          occurredAt: latest.occurredAt,
          status: 'DELETED',
          version: latest.version + 1,
        });
        await this.recordChange(transaction, userId, revision, 'DELETED');
        return this.repository.toView(revision);
      },
    );
  }

  private prepare(
    dto: CreateSettlementDto | ReplaceSettlementDto,
  ): PreparedSettlement {
    const fromUserId = dto.fromUserId.toLowerCase();
    const toUserId = dto.toUserId.toLowerCase();
    if (fromUserId === toUserId) {
      throw new BadRequestException('Settlement parties must be different.');
    }
    return {
      fromUserId,
      toUserId,
      amountMinor: parseMinorAmount(dto.amountMinor),
      occurredAt: new Date(dto.occurredAt),
    };
  }

  private requireActiveParties(
    transaction: DatabaseTransaction,
    ledgerId: string,
    settlement: Pick<PreparedSettlement, 'fromUserId' | 'toUserId'>,
  ): Promise<void> {
    return this.ledgers.requireActiveMembers(
      transaction,
      ledgerId,
      [settlement.fromUserId, settlement.toUserId],
      'Settlement parties must be active ledger members.',
    );
  }

  private async requireMutableSettlement(
    transaction: DatabaseTransaction,
    rootPaymentId: string,
    userId: string,
    expectedVersion: number,
  ): Promise<SettlementRevisionRow> {
    const [latest] = await this.repository.lockSettlementChain(
      transaction,
      rootPaymentId,
    );
    if (!latest || latest.createdByUserId !== userId) {
      throw new NotFoundException('Settlement not found.');
    }
    await this.ledgers.requireWritableLedger(
      transaction,
      latest.ledgerId,
      userId,
    );
    if (latest.version !== expectedVersion) {
      throw new ConflictException('Settlement version conflict.');
    }
    if (latest.status === 'DELETED') {
      throw new ConflictException('Deleted settlements cannot be changed.');
    }
    return latest;
  }

  // The payer's balance rises by the amount; the recipient's falls.
  private postings(
    settlement: PreparedSettlement,
  ): [SettlementPosting, SettlementPosting] {
    return [
      { userId: settlement.fromUserId, amountMinor: settlement.amountMinor },
      { userId: settlement.toUserId, amountMinor: -settlement.amountMinor },
    ];
  }

  private applyEffect(
    transaction: DatabaseTransaction,
    userId: string,
    revision: SettlementRevisionRow,
    prepared: PreparedSettlement,
  ): Promise<string> {
    return this.repository.insertFinancialEvent(transaction, {
      ledgerId: revision.ledgerId,
      paymentId: revision.id,
      eventType: revision.version === 1 ? 'CREATED' : 'REPLACEMENT',
      createdByUserId: userId,
      postings: this.postings(prepared),
    });
  }

  private async reverseEffect(
    transaction: DatabaseTransaction,
    userId: string,
    revision: SettlementRevisionRow,
  ): Promise<void> {
    const effect = await this.repository.getEffectSnapshot(
      transaction,
      revision.id,
    );
    if (!effect) {
      throw new Error('Settlement effect snapshot is missing.');
    }
    await this.repository.insertFinancialEvent(transaction, {
      ledgerId: revision.ledgerId,
      paymentId: revision.id,
      eventType: 'REVERSAL',
      reversesEventId: effect.id,
      createdByUserId: userId,
      postings: effect.postings.map((posting) => ({
        userId: posting.userId,
        amountMinor: -posting.amountMinor,
      })),
    });
  }

  private recordChange(
    transaction: DatabaseTransaction,
    actorUserId: string,
    revision: SettlementRevisionRow,
    eventType: SettlementChange,
  ): Promise<void> {
    return recordDomainChange(transaction, this.outbox, {
      actorUserId,
      aggregate: 'SETTLEMENT',
      aggregateId: revision.rootPaymentId,
      eventType,
      ledgerId: revision.ledgerId,
      payload: {
        version: revision.version,
        amountMinor: revision.amountMinor.toString(),
      },
    });
  }
}
