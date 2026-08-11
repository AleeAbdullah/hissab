import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import type { DatabaseTransaction } from '../../database/database.service';
import { activityEvents } from '../../database/schema';
import { IdempotencyService } from '../idempotency';
import { OutboxService } from '../outbox';
import type {
  CreateSettlementDto,
  ListSettlementsDto,
  ReplaceSettlementDto,
} from './dto/settlements.dto';
import {
  type SettlementCursor,
  type SettlementEffectSnapshot,
  type SettlementPosting,
  type SettlementRevisionRow,
  type SettlementView,
  SettlementsRepository,
} from './settlements.repository';

const MAX_MINOR = 9_223_372_036_854_775_807n;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PreparedSettlement {
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
  occurredAt: Date;
}

@Injectable()
export class SettlementsService {
  constructor(
    private readonly repository: SettlementsRepository,
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
        await this.requireWritableLedger(transaction, ledgerId, userId);
        const prepared = this.prepare(dto);
        await this.requireActiveParties(transaction, ledgerId, prepared);
        const revision = await this.repository.insertRevision(transaction, {
          ledgerId,
          createdByUserId: userId,
          ...prepared,
          status: 'ACTIVE',
          version: 1,
        });
        await this.repository.insertFinancialEvent(transaction, {
          ledgerId,
          paymentId: revision.id,
          eventType: 'CREATED',
          createdByUserId: userId,
          postings: this.postings(prepared),
        });
        await this.recordChange(
          transaction,
          userId,
          ledgerId,
          revision.rootPaymentId,
          'CREATED',
          revision.version,
          prepared.amountMinor,
        );
        return this.toView(revision);
      },
    );
  }

  async listSettlements(
    userId: string,
    ledgerId: string,
    query: ListSettlementsDto,
  ): Promise<{ items: SettlementView[]; nextCursor: string | null }> {
    const limit = query.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100.');
    }
    if (!(await this.repository.hasJoinedMembership(ledgerId, userId))) {
      throw new NotFoundException('Ledger not found.');
    }
    const rows = await this.repository.listSettlementViews(
      ledgerId,
      query.cursor ? this.decodeCursor(query.cursor) : null,
      limit + 1,
    );
    const items = rows.slice(0, limit);
    return {
      items,
      nextCursor:
        rows.length > limit && items.length > 0
          ? this.encodeCursor(items[items.length - 1])
          : null,
    };
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
        await this.requireActiveParties(transaction, latest.ledgerId, prepared);
        const effect = await this.requireEffect(transaction, latest.id);
        await this.reverseEffect(transaction, userId, latest, effect);
        const revision = await this.repository.insertRevision(transaction, {
          rootPaymentId: latest.rootPaymentId,
          replacesPaymentId: latest.id,
          ledgerId: latest.ledgerId,
          createdByUserId: latest.createdByUserId,
          ...prepared,
          status: 'ACTIVE',
          version: latest.version + 1,
        });
        await this.repository.insertFinancialEvent(transaction, {
          ledgerId: latest.ledgerId,
          paymentId: revision.id,
          eventType: 'REPLACEMENT',
          createdByUserId: userId,
          postings: this.postings(prepared),
        });
        await this.recordChange(
          transaction,
          userId,
          latest.ledgerId,
          rootPaymentId,
          'REPLACED',
          revision.version,
          prepared.amountMinor,
        );
        return this.toView(revision);
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
        const prepared = {
          fromUserId: latest.fromUserId,
          toUserId: latest.toUserId,
          amountMinor: latest.amountMinor,
          occurredAt: latest.occurredAt,
        };
        await this.requireActiveParties(transaction, latest.ledgerId, prepared);
        const effect = await this.requireEffect(transaction, latest.id);
        await this.reverseEffect(transaction, userId, latest, effect);
        const revision = await this.repository.insertRevision(transaction, {
          rootPaymentId: latest.rootPaymentId,
          replacesPaymentId: latest.id,
          ledgerId: latest.ledgerId,
          createdByUserId: latest.createdByUserId,
          ...prepared,
          status: 'DELETED',
          version: latest.version + 1,
        });
        await this.recordChange(
          transaction,
          userId,
          latest.ledgerId,
          rootPaymentId,
          'DELETED',
          revision.version,
          latest.amountMinor,
        );
        return this.toView(revision);
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
    if (!/^[1-9][0-9]*$/.test(dto.amountMinor)) {
      throw new BadRequestException(
        'Minor-unit amount must be a positive integer string.',
      );
    }
    const amountMinor = BigInt(dto.amountMinor);
    if (amountMinor > MAX_MINOR) {
      throw new BadRequestException('Minor-unit amount exceeds 64-bit range.');
    }
    const occurredAt = new Date(dto.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid date-time.');
    }
    return { fromUserId, toUserId, amountMinor, occurredAt };
  }

  private postings(
    settlement: PreparedSettlement,
  ): [SettlementPosting, SettlementPosting] {
    return [
      {
        userId: settlement.fromUserId,
        amountMinor: settlement.amountMinor,
      },
      {
        userId: settlement.toUserId,
        amountMinor: -settlement.amountMinor,
      },
    ];
  }

  private async requireWritableLedger(
    transaction: DatabaseTransaction,
    ledgerId: string,
    userId: string,
  ): Promise<void> {
    const ledger = await this.repository.lockLedger(transaction, ledgerId);
    if (
      !ledger ||
      !(await this.repository.isActiveMember(transaction, ledgerId, userId))
    ) {
      throw new NotFoundException('Ledger not found.');
    }
    if (ledger.status !== 'ACTIVE') {
      throw new ConflictException('Archived ledgers are read-only.');
    }
  }

  private async requireActiveParties(
    transaction: DatabaseTransaction,
    ledgerId: string,
    settlement: PreparedSettlement,
  ): Promise<void> {
    const parties = [settlement.fromUserId, settlement.toUserId].sort();
    const active = await this.repository.findActiveMemberIds(
      transaction,
      ledgerId,
      parties,
    );
    if (active.length !== 2) {
      throw new BadRequestException(
        'Settlement parties must be active ledger members.',
      );
    }
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
    await this.requireWritableLedger(transaction, latest.ledgerId, userId);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(
        'expectedVersion must be a positive integer.',
      );
    }
    if (latest.version !== expectedVersion) {
      throw new ConflictException('Settlement version conflict.');
    }
    if (latest.status === 'DELETED') {
      throw new ConflictException('Deleted settlements cannot be changed.');
    }
    return latest;
  }

  private async requireEffect(
    transaction: DatabaseTransaction,
    paymentId: string,
  ): Promise<SettlementEffectSnapshot> {
    const effect = await this.repository.getEffectSnapshot(
      transaction,
      paymentId,
    );
    if (!effect) {
      throw new Error('Settlement effect snapshot is missing.');
    }
    return effect;
  }

  private async reverseEffect(
    transaction: DatabaseTransaction,
    userId: string,
    revision: SettlementRevisionRow,
    effect: SettlementEffectSnapshot,
  ): Promise<void> {
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

  private toView(revision: SettlementRevisionRow): SettlementView {
    return {
      id: revision.rootPaymentId,
      ledgerId: revision.ledgerId,
      createdByUserId: revision.createdByUserId,
      fromUserId: revision.fromUserId,
      toUserId: revision.toUserId,
      amountMinor: revision.amountMinor.toString(),
      occurredAt: revision.occurredAt,
      status: revision.status,
      version: revision.version,
      createdAt: revision.createdAt,
    };
  }

  private encodeCursor(settlement: SettlementView): string {
    return Buffer.from(
      JSON.stringify([settlement.occurredAt.toISOString(), settlement.id]),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): SettlementCursor {
    try {
      const parsed: unknown = JSON.parse(
        Buffer.from(cursor, 'base64url').toString('utf8'),
      );
      if (
        !Array.isArray(parsed) ||
        parsed.length !== 2 ||
        typeof parsed[0] !== 'string' ||
        typeof parsed[1] !== 'string' ||
        !UUID_PATTERN.test(parsed[1])
      ) {
        throw new Error('invalid cursor');
      }
      const occurredAt = new Date(parsed[0]);
      if (Number.isNaN(occurredAt.getTime())) {
        throw new Error('invalid cursor date');
      }
      return { occurredAt, rootId: parsed[1].toLowerCase() };
    } catch {
      throw new BadRequestException('Invalid settlement cursor.');
    }
  }

  private async recordChange(
    transaction: DatabaseTransaction,
    actorUserId: string,
    ledgerId: string,
    settlementId: string,
    eventType: 'CREATED' | 'REPLACED' | 'DELETED',
    version: number,
    amountMinor: bigint,
  ): Promise<void> {
    const payload = { version, amountMinor: amountMinor.toString() };
    await transaction.insert(activityEvents).values({
      actorUserId,
      ledgerId,
      eventType: `SETTLEMENT_${eventType}`,
      aggregateType: 'SETTLEMENT',
      aggregateId: settlementId,
      payload,
    });
    await this.outbox.enqueue(transaction, {
      eventType: `settlement.${eventType.toLowerCase()}`,
      aggregateType: 'settlement',
      aggregateId: settlementId,
      payload: { actorUserId, ledgerId, ...payload },
    });
  }
}
