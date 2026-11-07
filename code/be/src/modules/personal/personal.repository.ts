import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';

import type { OccurrenceCursor } from '../../common/cursor';
import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  categories,
  personalLedgers,
  personalTransactions,
} from '../../database/schema';
import {
  PERSONAL_CATEGORY_CODES,
  type PersonalTransactionType,
} from './personal.dto';

export type PersonalTransactionRevision =
  typeof personalTransactions.$inferSelect;

export interface PersonalCategoryView {
  code: string;
  name: string;
  kind: PersonalTransactionType;
}

export interface PersonalTransactionView {
  id: string;
  type: PersonalTransactionType;
  amountMinor: string;
  category: { code: string; name: string };
  description: string;
  merchantOrSource: string | null;
  occurredAt: Date;
  notes: string | null;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  createdAt: Date;
}

export interface PersonalCategory extends PersonalCategoryView {
  id: string;
}

export interface PersonalTransactionFilters {
  from: Date | null;
  to: Date | null;
  type?: PersonalTransactionType;
  categoryCode?: string;
  search?: string;
  minAmountMinor?: bigint;
  maxAmountMinor?: bigint;
}

export interface ReportBucketRow {
  type: PersonalTransactionType;
  period: string;
  amountMinor: string;
}

export interface PersonalHistoryItemView {
  kind: 'PERSONAL' | 'SHARED';
  id: string;
  type: PersonalTransactionType;
  amountMinor: string;
  totalMinor: string | null;
  paidMinor: string | null;
  owedMinor: string | null;
  category: { code: string; name: string };
  description: string;
  occurredAt: string;
  ledgerId: string | null;
  ledgerName: string | null;
}

export interface PersonalHistoryRead {
  items: PersonalHistoryItemView[];
  buckets: Array<{
    period: string;
    incomeMinor: string;
    expenseMinor: string;
    netMinor: string;
  }>;
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
  maxAmountMinor: string | null;
}

interface PersonalTransactionReadRow {
  rootPersonalTransactionId: string;
  type: PersonalTransactionType;
  amountMinor: string;
  categoryCode: string;
  categoryName: string;
  description: string;
  merchantOrSource: string | null;
  occurredAt: Date;
  notes: string | null;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  createdAt: Date;
}

interface InsertRevisionInput {
  rootPersonalTransactionId?: string;
  replacesPersonalTransactionId?: string;
  personalLedgerId: string;
  type: PersonalTransactionType;
  amountMinor: bigint;
  categoryId: string;
  description: string;
  merchantOrSource: string | null;
  occurredAt: Date;
  notes: string | null;
  status: 'ACTIVE' | 'DELETED';
  version: number;
}

@Injectable()
export class PersonalRepository {
  constructor(private readonly database: DatabaseService) {}

  async listCategories(): Promise<PersonalCategoryView[]> {
    const rows = await this.database.db
      .select({
        code: categories.code,
        name: categories.name,
        kind: categories.kind,
      })
      .from(categories)
      .where(
        and(
          eq(categories.isSystem, true),
          inArray(categories.code, [...PERSONAL_CATEGORY_CODES]),
        ),
      );
    return rows.flatMap(({ code, name, kind }) =>
      code && (kind === 'INCOME' || kind === 'EXPENSE')
        ? [{ code, name, kind }]
        : [],
    );
  }

  async findCategory(
    transaction: DatabaseTransaction,
    key: { code: string; type: PersonalTransactionType } | { id: string },
  ): Promise<PersonalCategory | undefined> {
    const [category] = await transaction
      .select({
        id: categories.id,
        code: categories.code,
        name: categories.name,
        kind: categories.kind,
      })
      .from(categories)
      .where(
        and(
          'code' in key
            ? and(eq(categories.code, key.code), eq(categories.kind, key.type))
            : eq(categories.id, key.id),
          eq(categories.isSystem, true),
          inArray(categories.code, [...PERSONAL_CATEGORY_CODES]),
        ),
      )
      .limit(1);
    return category?.code &&
      (category.kind === 'INCOME' || category.kind === 'EXPENSE')
      ? { ...category, code: category.code, kind: category.kind }
      : undefined;
  }

  async ensureAndLockLedger(
    transaction: DatabaseTransaction,
    userId: string,
  ): Promise<string> {
    await transaction
      .insert(personalLedgers)
      .values({ userId })
      .onConflictDoNothing({ target: personalLedgers.userId });
    const [ledger] = await transaction
      .select({ id: personalLedgers.id })
      .from(personalLedgers)
      .where(eq(personalLedgers.userId, userId))
      .limit(1)
      .for('update');
    if (!ledger) {
      throw new Error('Personal ledger is missing.');
    }
    return ledger.id;
  }

  async lockTransactionChain(
    transaction: DatabaseTransaction,
    userId: string,
    rootPersonalTransactionId: string,
  ): Promise<PersonalTransactionRevision[]> {
    const [root] = await transaction
      .select({ id: personalTransactions.id })
      .from(personalTransactions)
      .innerJoin(
        personalLedgers,
        eq(personalLedgers.id, personalTransactions.personalLedgerId),
      )
      .where(
        and(
          eq(personalTransactions.id, rootPersonalTransactionId),
          eq(
            personalTransactions.rootPersonalTransactionId,
            rootPersonalTransactionId,
          ),
          eq(personalLedgers.userId, userId),
        ),
      )
      .limit(1)
      .for('update', { of: personalTransactions });
    if (!root) {
      return [];
    }
    return transaction
      .select()
      .from(personalTransactions)
      .where(
        eq(
          personalTransactions.rootPersonalTransactionId,
          rootPersonalTransactionId,
        ),
      )
      .orderBy(desc(personalTransactions.version))
      .for('update');
  }

  async hasOwnedTransaction(
    transaction: DatabaseTransaction,
    userId: string,
    rootPersonalTransactionId: string,
  ): Promise<boolean> {
    const [owned] = await transaction
      .select({ id: personalTransactions.id })
      .from(personalTransactions)
      .innerJoin(
        personalLedgers,
        eq(personalLedgers.id, personalTransactions.personalLedgerId),
      )
      .where(
        and(
          eq(
            personalTransactions.rootPersonalTransactionId,
            rootPersonalTransactionId,
          ),
          eq(personalLedgers.userId, userId),
        ),
      )
      .limit(1);
    return Boolean(owned);
  }

  async insertRevision(
    transaction: DatabaseTransaction,
    input: InsertRevisionInput,
  ): Promise<PersonalTransactionRevision> {
    const id = randomUUID();
    const [revision] = await transaction
      .insert(personalTransactions)
      .values({
        id,
        rootPersonalTransactionId: input.rootPersonalTransactionId ?? id,
        replacesPersonalTransactionId: input.replacesPersonalTransactionId,
        personalLedgerId: input.personalLedgerId,
        type: input.type,
        amountMinor: input.amountMinor,
        categoryId: input.categoryId,
        description: input.description,
        merchantOrSource: input.merchantOrSource,
        occurredAt: input.occurredAt,
        notes: input.notes,
        status: input.status,
        version: input.version,
      })
      .returning();
    if (!revision) {
      throw new Error('Personal transaction revision insert returned no row.');
    }
    return revision;
  }

  async listTransactions(
    userId: string,
    filters: PersonalTransactionFilters,
    cursor: OccurrenceCursor | null,
    limit: number,
  ): Promise<PersonalTransactionView[]> {
    const result = await this.database.pool.query<PersonalTransactionReadRow>(
      `
        WITH ranked AS (
          SELECT personal_transaction.*,
                 row_number() OVER (
                   PARTITION BY personal_transaction.root_personal_transaction_id
                   ORDER BY personal_transaction.version DESC
                 ) AS revision_order
          FROM personal_transactions personal_transaction
          JOIN personal_ledgers personal_ledger
            ON personal_ledger.id = personal_transaction.personal_ledger_id
           AND personal_ledger.user_id = $1::uuid
        )
        SELECT personal_transaction.root_personal_transaction_id AS "rootPersonalTransactionId",
               personal_transaction.type,
               personal_transaction.amount_minor::text AS "amountMinor",
               category.code AS "categoryCode",
               category.name AS "categoryName",
               personal_transaction.description,
               personal_transaction.merchant_or_source AS "merchantOrSource",
               personal_transaction.occurred_at AS "occurredAt",
               personal_transaction.notes,
               personal_transaction.status,
               personal_transaction.version,
               personal_transaction.created_at AS "createdAt"
        FROM ranked personal_transaction
        JOIN categories category ON category.id = personal_transaction.category_id
        WHERE personal_transaction.revision_order = 1
          AND ($2::timestamptz IS NULL OR personal_transaction.occurred_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR personal_transaction.occurred_at < $3::timestamptz)
          AND ($4::text IS NULL OR personal_transaction.type::text = $4::text)
          AND ($5::text IS NULL OR category.code = $5::text)
          AND (
            $6::text IS NULL
            OR position(lower($6::text) in lower(concat_ws(' ',
              personal_transaction.description,
              personal_transaction.merchant_or_source,
              personal_transaction.notes,
              category.name
            ))) > 0
          )
          AND ($7::bigint IS NULL OR personal_transaction.amount_minor >= $7::bigint)
          AND ($8::bigint IS NULL OR personal_transaction.amount_minor <= $8::bigint)
          AND (
            $9::timestamptz IS NULL
            OR (personal_transaction.occurred_at, personal_transaction.root_personal_transaction_id)
               < ($9::timestamptz, $10::uuid)
          )
        ORDER BY personal_transaction.occurred_at DESC,
                 personal_transaction.root_personal_transaction_id DESC
        LIMIT $11
      `,
      [
        userId,
        filters.from,
        filters.to,
        filters.type ?? null,
        filters.categoryCode ?? null,
        filters.search ?? null,
        filters.minAmountMinor?.toString() ?? null,
        filters.maxAmountMinor?.toString() ?? null,
        cursor?.occurredAt ?? null,
        cursor?.rootId ?? null,
        limit,
      ],
    );
    return result.rows.map((row) => this.toView(row));
  }

  async maxTransactionAmountMinor(userId: string): Promise<string | null> {
    const result = await this.database.pool.query<{
      maxAmountMinor: string | null;
    }>(
      `
        WITH ranked AS (
          SELECT personal_transaction.amount_minor,
                 personal_transaction.status,
                 row_number() OVER (
                   PARTITION BY personal_transaction.root_personal_transaction_id
                   ORDER BY personal_transaction.version DESC
                 ) AS revision_order
          FROM personal_transactions personal_transaction
          JOIN personal_ledgers personal_ledger
            ON personal_ledger.id = personal_transaction.personal_ledger_id
           AND personal_ledger.user_id = $1::uuid
        )
        SELECT max(amount_minor)::text AS "maxAmountMinor"
        FROM ranked
        WHERE revision_order = 1 AND status = 'ACTIVE'
      `,
      [userId],
    );
    return result.rows[0]?.maxAmountMinor ?? null;
  }

  async listHistory(
    userId: string,
    filters: PersonalTransactionFilters,
    includeShared: boolean,
    bucket: 'DAY' | 'MONTH',
    cursor: OccurrenceCursor | null,
    limit: number,
  ): Promise<PersonalHistoryRead> {
    const result = await this.database.pool.query<PersonalHistoryRead>(
      `
        WITH ranked_personal AS (
          SELECT personal_transaction.*,
                 row_number() OVER (
                   PARTITION BY personal_transaction.root_personal_transaction_id
                   ORDER BY personal_transaction.version DESC
                 ) AS revision_order
          FROM personal_transactions personal_transaction
          JOIN personal_ledgers personal_ledger
            ON personal_ledger.id = personal_transaction.personal_ledger_id
           AND personal_ledger.user_id = $1::uuid
        ), ranked_expenses AS (
          SELECT expense.*,
                 row_number() OVER (
                   PARTITION BY expense.root_expense_id
                   ORDER BY expense.version DESC
                 ) AS revision_order
          FROM expenses expense
          JOIN ledger_members member
            ON member.ledger_id = expense.ledger_id
           AND member.user_id = $1::uuid
           AND member.joined_at IS NOT NULL
          WHERE $2::boolean
        ), entries AS (
          SELECT 'PERSONAL'::text AS kind,
                 personal_transaction.root_personal_transaction_id AS id,
                 personal_transaction.type::text AS type,
                 personal_transaction.amount_minor AS amount_minor,
                 NULL::bigint AS total_minor,
                 NULL::bigint AS paid_minor,
                 NULL::bigint AS owed_minor,
                 category.code AS category_code,
                 category.name AS category_name,
                 personal_transaction.description,
                 personal_transaction.occurred_at,
                 NULL::uuid AS ledger_id,
                 NULL::text AS ledger_name,
                 concat_ws(' ', personal_transaction.description,
                   personal_transaction.merchant_or_source,
                   personal_transaction.notes, category.name) AS search_text
          FROM ranked_personal personal_transaction
          JOIN categories category ON category.id = personal_transaction.category_id
          WHERE personal_transaction.revision_order = 1
            AND personal_transaction.status = 'ACTIVE'

          UNION ALL

          SELECT 'SHARED'::text,
                 expense.root_expense_id,
                 'EXPENSE'::text,
                 COALESCE(split.owed_minor, 0),
                 expense.total_minor,
                 payer.amount_minor,
                 split.owed_minor,
                 category.code,
                 category.name,
                 expense.description,
                 expense.occurred_at,
                 expense.ledger_id,
                 COALESCE(group_profile.name, friend.display_name, 'Shared ledger'),
                 concat_ws(' ', expense.description, category.name,
                   group_profile.name, friend.display_name)
          FROM ranked_expenses expense
          LEFT JOIN expense_payers payer
            ON payer.expense_id = expense.id AND payer.user_id = $1::uuid
          LEFT JOIN expense_splits split
            ON split.expense_id = expense.id AND split.user_id = $1::uuid
          JOIN categories category ON category.id = expense.category_id
          JOIN ledgers ledger ON ledger.id = expense.ledger_id
          LEFT JOIN group_profiles group_profile ON group_profile.ledger_id = ledger.id
          LEFT JOIN users friend ON friend.id = CASE
            WHEN ledger.direct_low_user_id = $1::uuid THEN ledger.direct_high_user_id
            ELSE ledger.direct_low_user_id END
          WHERE expense.revision_order = 1
            AND expense.status = 'ACTIVE'
            AND (payer.user_id IS NOT NULL OR split.user_id IS NOT NULL)
        ), filtered AS (
          SELECT * FROM entries entry
          WHERE ($3::timestamptz IS NULL OR entry.occurred_at >= $3::timestamptz)
            AND ($4::timestamptz IS NULL OR entry.occurred_at < $4::timestamptz)
            AND ($5::text IS NULL OR entry.type = $5::text)
            AND ($6::text IS NULL OR entry.category_code = $6::text)
            AND ($7::text IS NULL OR position(lower($7::text) in lower(entry.search_text)) > 0)
            AND ($8::bigint IS NULL OR entry.amount_minor >= $8::bigint)
            AND ($9::bigint IS NULL OR entry.amount_minor <= $9::bigint)
        ), page AS (
          SELECT * FROM filtered
          WHERE $10::timestamptz IS NULL
             OR (occurred_at, id) < ($10::timestamptz, $11::uuid)
          ORDER BY occurred_at DESC, id DESC
          LIMIT $12
        ), bucket_totals AS (
          SELECT CASE WHEN $13::text = 'DAY'
                   THEN to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
                   ELSE to_char(occurred_at AT TIME ZONE 'UTC', 'YYYY-MM')
                 END AS period,
                 COALESCE(sum(amount_minor) FILTER (WHERE type = 'INCOME'), 0) AS income_minor,
                 COALESCE(sum(amount_minor) FILTER (WHERE type = 'EXPENSE'), 0) AS expense_minor
          FROM filtered
          GROUP BY 1
        )
        SELECT COALESCE((
          SELECT json_agg(json_build_object(
            'kind', kind, 'id', id, 'type', type,
            'amountMinor', amount_minor::text,
            'totalMinor', total_minor::text,
            'paidMinor', paid_minor::text,
            'owedMinor', owed_minor::text,
            'category', json_build_object('code', category_code, 'name', category_name),
            'description', description, 'occurredAt', occurred_at,
            'ledgerId', ledger_id, 'ledgerName', ledger_name
          ) ORDER BY occurred_at DESC, id DESC) FROM page
        ), '[]'::json) AS items,
        COALESCE((
          SELECT json_agg(json_build_object(
            'period', period, 'incomeMinor', income_minor::text,
            'expenseMinor', expense_minor::text,
            'netMinor', (income_minor - expense_minor)::text
          ) ORDER BY period) FROM bucket_totals
        ), '[]'::json) AS buckets,
        COALESCE((SELECT sum(amount_minor) FILTER (WHERE type = 'INCOME') FROM filtered), 0)::text AS "incomeMinor",
        COALESCE((SELECT sum(amount_minor) FILTER (WHERE type = 'EXPENSE') FROM filtered), 0)::text AS "expenseMinor",
        COALESCE((SELECT sum(CASE WHEN type = 'INCOME' THEN amount_minor ELSE -amount_minor END) FROM filtered), 0)::text AS "netMinor",
        (SELECT max(amount_minor)::text FROM entries WHERE amount_minor > 0) AS "maxAmountMinor"
      `,
      [
        userId,
        includeShared,
        filters.from,
        filters.to,
        filters.type ?? null,
        filters.categoryCode ?? null,
        filters.search ?? null,
        filters.minAmountMinor?.toString() ?? null,
        filters.maxAmountMinor?.toString() ?? null,
        cursor?.occurredAt ?? null,
        cursor?.rootId ?? null,
        limit,
        bucket,
      ],
    );
    if (!result.rows[0])
      throw new Error('Personal history query returned no row.');
    return result.rows[0];
  }

  async findTransaction(
    userId: string,
    rootPersonalTransactionId: string,
  ): Promise<PersonalTransactionView | null> {
    const result = await this.database.pool.query<PersonalTransactionReadRow>(
      `
        SELECT personal_transaction.root_personal_transaction_id AS "rootPersonalTransactionId",
               personal_transaction.type,
               personal_transaction.amount_minor::text AS "amountMinor",
               category.code AS "categoryCode",
               category.name AS "categoryName",
               personal_transaction.description,
               personal_transaction.merchant_or_source AS "merchantOrSource",
               personal_transaction.occurred_at AS "occurredAt",
               personal_transaction.notes,
               personal_transaction.status,
               personal_transaction.version,
               personal_transaction.created_at AS "createdAt"
        FROM personal_transactions personal_transaction
        JOIN personal_ledgers personal_ledger
          ON personal_ledger.id = personal_transaction.personal_ledger_id
         AND personal_ledger.user_id = $1::uuid
        JOIN categories category ON category.id = personal_transaction.category_id
        WHERE personal_transaction.root_personal_transaction_id = $2::uuid
        ORDER BY personal_transaction.version DESC
        LIMIT 1
      `,
      [userId, rootPersonalTransactionId],
    );
    return result.rows[0] ? this.toView(result.rows[0]) : null;
  }

  async listReportBuckets(
    userId: string,
    filters: PersonalTransactionFilters,
    includeShared: boolean,
    bucket: 'DAY' | 'MONTH',
  ): Promise<ReportBucketRow[]> {
    const result = await this.database.pool.query<ReportBucketRow>(
      `
        WITH ranked_personal AS (
          SELECT personal_transaction.*,
                 row_number() OVER (
                   PARTITION BY personal_transaction.root_personal_transaction_id
                   ORDER BY personal_transaction.version DESC
                 ) AS revision_order
          FROM personal_transactions personal_transaction
          JOIN personal_ledgers personal_ledger
            ON personal_ledger.id = personal_transaction.personal_ledger_id
           AND personal_ledger.user_id = $1::uuid
        ), candidate_expense_roots AS (
          SELECT DISTINCT expense.root_expense_id
          FROM expenses expense
          JOIN expense_splits split
            ON split.expense_id = expense.id
           AND split.user_id = $1::uuid
          WHERE $7::boolean
        ), ranked_expenses AS (
          SELECT expense.*,
                 row_number() OVER (
                   PARTITION BY expense.root_expense_id
                   ORDER BY expense.version DESC
                 ) AS revision_order
          FROM expenses expense
          JOIN candidate_expense_roots candidate
            ON candidate.root_expense_id = expense.root_expense_id
        ), entries AS (
          SELECT personal_transaction.type::text AS type,
                 personal_transaction.amount_minor AS amount_minor,
                 category.code AS category_code,
                 personal_transaction.occurred_at
          FROM ranked_personal personal_transaction
          JOIN categories category ON category.id = personal_transaction.category_id
          WHERE personal_transaction.revision_order = 1
            AND personal_transaction.status = 'ACTIVE'

          UNION ALL

          SELECT 'EXPENSE'::text AS type,
                 split.owed_minor AS amount_minor,
                 category.code AS category_code,
                 expense.occurred_at
          FROM ranked_expenses expense
          JOIN expense_splits split
            ON split.expense_id = expense.id
           AND split.user_id = $1::uuid
          JOIN categories category ON category.id = expense.category_id
          WHERE expense.revision_order = 1
            AND expense.status = 'ACTIVE'
        )
        SELECT entry.type,
               CASE WHEN $6::text = 'DAY'
                 THEN to_char(entry.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')
                 ELSE to_char(entry.occurred_at AT TIME ZONE 'UTC', 'YYYY-MM')
               END AS period,
               sum(entry.amount_minor)::text AS "amountMinor"
        FROM entries entry
        WHERE ($2::timestamptz IS NULL OR entry.occurred_at >= $2::timestamptz)
          AND ($3::timestamptz IS NULL OR entry.occurred_at < $3::timestamptz)
          AND ($4::text IS NULL OR entry.type = $4::text)
          AND ($5::text IS NULL OR entry.category_code = $5::text)
        GROUP BY 1, 2
        ORDER BY 2, 1
      `,
      [
        userId,
        filters.from,
        filters.to,
        filters.type ?? null,
        filters.categoryCode ?? null,
        bucket,
        includeShared,
      ],
    );
    return result.rows;
  }

  private toView(row: PersonalTransactionReadRow): PersonalTransactionView {
    return {
      id: row.rootPersonalTransactionId,
      type: row.type,
      amountMinor: row.amountMinor,
      category: { code: row.categoryCode, name: row.categoryName },
      description: row.description,
      merchantOrSource: row.merchantOrSource,
      occurredAt: row.occurredAt,
      notes: row.notes,
      status: row.status,
      version: row.version,
      createdAt: row.createdAt,
    };
  }
}
