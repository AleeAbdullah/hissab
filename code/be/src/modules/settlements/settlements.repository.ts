import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { and, desc, eq, ne } from 'drizzle-orm';

import type { OccurrenceCursor } from '../../common/cursor';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  financialEvents,
  ledgerPostings,
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
  occurredAt: Date;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  createdAt: Date;
}

export interface SettlementPosting {
  userId: string;
  amountMinor: bigint;
}

export interface SettlementEffectSnapshot {
  id: string;
  postings: LedgerPostingRow[];
}

interface InsertRevisionInput {
  rootPaymentId?: string;
  replacesPaymentId?: string;
  ledgerId: string;
  createdByUserId: string;
  fromUserId: string;
  toUserId: string;
  amountMinor: bigint;
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

const SETTLEMENT_READ_COLUMNS = `
  payment.root_payment_id AS id,
  payment.ledger_id AS "ledgerId",
  payment.created_by_user_id AS "createdByUserId",
  payment.from_user_id AS "fromUserId",
  payment.to_user_id AS "toUserId",
  payment.amount_minor::text AS "amountMinor",
  payment.occurred_at AS "occurredAt",
  payment.status,
  payment.version,
  payment.created_at AS "createdAt"
`;

@Injectable()
export class SettlementsRepository {
  constructor(private readonly database: DatabaseService) {}

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
    cursor: OccurrenceCursor | null,
    limit: number,
  ): Promise<SettlementView[]> {
    const result = await this.database.pool.query<SettlementView>(
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
        SELECT ${SETTLEMENT_READ_COLUMNS}
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
    return result.rows;
  }

  async findSettlementView(
    userId: string,
    rootPaymentId: string,
  ): Promise<SettlementView | null> {
    const result = await this.database.pool.query<SettlementView>(
      `
        SELECT ${SETTLEMENT_READ_COLUMNS}
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
    return result.rows[0] ?? null;
  }

  toView(revision: SettlementRevisionRow): SettlementView {
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
}
