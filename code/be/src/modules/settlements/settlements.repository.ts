import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm';

import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  financialEvents,
  ledgerMembers,
  ledgerPostings,
  ledgers,
  payments,
} from '../../database/schema';

export type SettlementRevisionRow = typeof payments.$inferSelect;
type LedgerPostingRow = typeof ledgerPostings.$inferSelect;

export interface SettlementView {
  id: string;
  ledgerId: string;
  createdByUserId: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: string;
  currency: string;
  occurredAt: Date;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  createdAt: Date;
}

export interface SettlementCursor {
  occurredAt: Date;
  rootId: string;
}

export interface SettlementPosting {
  userId: string;
  amountMinor: bigint;
  currency: string;
}

export interface SettlementEffectSnapshot {
  id: string;
  postings: LedgerPostingRow[];
}

interface SettlementReadRow {
  rootPaymentId: string;
  ledgerId: string;
  createdByUserId: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: string;
  currency: string;
  occurredAt: Date;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  createdAt: Date;
}

interface InsertRevisionInput {
  rootPaymentId?: string;
  replacesPaymentId?: string;
  ledgerId: string;
  createdByUserId: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
  currency: string;
  occurredAt: Date;
  status: 'ACTIVE' | 'DELETED';
  version: number;
}

interface InsertFinancialEventInput {
  ledgerId: string;
  paymentId: string;
  eventType: 'CREATED' | 'REPLACEMENT' | 'REVERSAL';
  reversesEventId?: string;
  createdByUserId: string;
  postings: SettlementPosting[];
}

@Injectable()
export class SettlementsRepository {
  constructor(private readonly database: DatabaseService) {}

  async lockLedger(
    transaction: DatabaseTransaction,
    ledgerId: string,
  ): Promise<{ id: string; status: 'ACTIVE' | 'ARCHIVED' } | undefined> {
    const [ledger] = await transaction
      .select({ id: ledgers.id, status: ledgers.status })
      .from(ledgers)
      .where(eq(ledgers.id, ledgerId))
      .limit(1)
      .for('update');
    return ledger;
  }

  async isActiveMember(
    transaction: DatabaseTransaction,
    ledgerId: string,
    userId: string,
  ): Promise<boolean> {
    const [member] = await transaction
      .select({ userId: ledgerMembers.userId })
      .from(ledgerMembers)
      .where(
        and(
          eq(ledgerMembers.ledgerId, ledgerId),
          eq(ledgerMembers.userId, userId),
          eq(ledgerMembers.status, 'ACTIVE'),
        ),
      )
      .limit(1);
    return Boolean(member);
  }

  async findActiveMemberIds(
    transaction: DatabaseTransaction,
    ledgerId: string,
    userIds: string[],
  ): Promise<string[]> {
    const rows = await transaction
      .select({ userId: ledgerMembers.userId })
      .from(ledgerMembers)
      .where(
        and(
          eq(ledgerMembers.ledgerId, ledgerId),
          eq(ledgerMembers.status, 'ACTIVE'),
          inArray(ledgerMembers.userId, userIds),
        ),
      );
    return rows.map(({ userId }) => userId);
  }

  async hasJoinedMembership(
    ledgerId: string,
    userId: string,
  ): Promise<boolean> {
    const [member] = await this.database.db
      .select({ userId: ledgerMembers.userId })
      .from(ledgerMembers)
      .where(
        and(
          eq(ledgerMembers.ledgerId, ledgerId),
          eq(ledgerMembers.userId, userId),
          isNotNull(ledgerMembers.joinedAt),
        ),
      )
      .limit(1);
    return Boolean(member);
  }

  async lockSettlementChain(
    transaction: DatabaseTransaction,
    rootPaymentId: string,
  ): Promise<SettlementRevisionRow[]> {
    const [root] = await transaction
      .select({ id: payments.id })
      .from(payments)
      .where(
        and(
          eq(payments.id, rootPaymentId),
          eq(payments.rootPaymentId, rootPaymentId),
        ),
      )
      .limit(1)
      .for('update');
    if (!root) {
      return [];
    }
    return transaction
      .select()
      .from(payments)
      .where(eq(payments.rootPaymentId, rootPaymentId))
      .orderBy(desc(payments.version))
      .for('update');
  }

  async insertRevision(
    transaction: DatabaseTransaction,
    input: InsertRevisionInput,
  ): Promise<SettlementRevisionRow> {
    const id = randomUUID();
    const [revision] = await transaction
      .insert(payments)
      .values({
        id,
        rootPaymentId: input.rootPaymentId ?? id,
        replacesPaymentId: input.replacesPaymentId,
        ledgerId: input.ledgerId,
        createdByUserId: input.createdByUserId,
        fromUserId: input.fromUserId,
        toUserId: input.toUserId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        occurredAt: input.occurredAt,
        status: input.status,
        version: input.version,
      })
      .returning();
    if (!revision) {
      throw new Error('Settlement revision insert returned no row.');
    }
    return revision;
  }

  async insertFinancialEvent(
    transaction: DatabaseTransaction,
    input: InsertFinancialEventInput,
  ): Promise<string> {
    const [event] = await transaction
      .insert(financialEvents)
      .values({
        ledgerId: input.ledgerId,
        paymentId: input.paymentId,
        eventType: input.eventType,
        reversesEventId: input.reversesEventId,
        createdByUserId: input.createdByUserId,
      })
      .returning({ id: financialEvents.id });
    if (!event) {
      throw new Error('Settlement financial event insert returned no row.');
    }
    await transaction.insert(ledgerPostings).values(
      input.postings.map((posting) => ({
        financialEventId: event.id,
        userId: posting.userId,
        amountMinor: posting.amountMinor,
        currency: posting.currency,
      })),
    );
    return event.id;
  }

  async getEffectSnapshot(
    transaction: DatabaseTransaction,
    paymentId: string,
  ): Promise<SettlementEffectSnapshot | undefined> {
    const [event] = await transaction
      .select({ id: financialEvents.id })
      .from(financialEvents)
      .where(
        and(
          eq(financialEvents.paymentId, paymentId),
          ne(financialEvents.eventType, 'REVERSAL'),
        ),
      )
      .limit(1);
    if (!event) {
      return undefined;
    }
    const postings = await transaction
      .select()
      .from(ledgerPostings)
      .where(eq(ledgerPostings.financialEventId, event.id));
    return { id: event.id, postings };
  }

  async listSettlementViews(
    ledgerId: string,
    cursor: SettlementCursor | null,
    limit: number,
  ): Promise<SettlementView[]> {
    const result = await this.database.pool.query<SettlementReadRow>(
      `
        WITH ranked AS (
          SELECT payment.*,
                 row_number() OVER (
                   PARTITION BY payment.root_payment_id
                   ORDER BY payment.version DESC
                 ) AS revision_order
          FROM payments payment
          WHERE payment.ledger_id = $1::uuid
        )
        SELECT payment.root_payment_id AS "rootPaymentId",
               payment.ledger_id AS "ledgerId",
               payment.created_by_user_id AS "createdByUserId",
               payment.from_user_id AS "fromUserId",
               payment.to_user_id AS "toUserId",
               payment.amount_minor::text AS "amountMinor",
               payment.currency,
               payment.occurred_at AS "occurredAt",
               payment.status,
               payment.version,
               payment.created_at AS "createdAt"
        FROM ranked payment
        WHERE payment.revision_order = 1
          AND (
            $2::timestamptz IS NULL
            OR (payment.occurred_at, payment.root_payment_id)
               < ($2::timestamptz, $3::uuid)
          )
        ORDER BY payment.occurred_at DESC, payment.root_payment_id DESC
        LIMIT $4
      `,
      [ledgerId, cursor?.occurredAt ?? null, cursor?.rootId ?? null, limit],
    );
    return result.rows.map((row) => ({
      id: row.rootPaymentId,
      ledgerId: row.ledgerId,
      createdByUserId: row.createdByUserId,
      fromUserId: row.fromUserId,
      toUserId: row.toUserId,
      amountMinor: row.amountMinor,
      currency: row.currency,
      occurredAt: row.occurredAt,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt,
    }));
  }

  async findSettlementView(
    userId: string,
    rootPaymentId: string,
  ): Promise<SettlementView | null> {
    const result = await this.database.pool.query<SettlementReadRow>(
      `
        SELECT payment.root_payment_id AS "rootPaymentId",
               payment.ledger_id AS "ledgerId",
               payment.created_by_user_id AS "createdByUserId",
               payment.from_user_id AS "fromUserId",
               payment.to_user_id AS "toUserId",
               payment.amount_minor::text AS "amountMinor",
               payment.currency,
               payment.occurred_at AS "occurredAt",
               payment.status,
               payment.version,
               payment.created_at AS "createdAt"
        FROM payments payment
        JOIN ledger_members member
          ON member.ledger_id = payment.ledger_id
         AND member.user_id = $1::uuid
         AND member.joined_at IS NOT NULL
        WHERE payment.root_payment_id = $2::uuid
        ORDER BY payment.version DESC
        LIMIT 1
      `,
      [userId, rootPaymentId],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.rootPaymentId,
          ledgerId: row.ledgerId,
          createdByUserId: row.createdByUserId,
          fromUserId: row.fromUserId,
          toUserId: row.toUserId,
          amountMinor: row.amountMinor,
          currency: row.currency,
          occurredAt: row.occurredAt,
          status: row.status,
          version: row.version,
          createdAt: row.createdAt,
        }
      : null;
  }
}
