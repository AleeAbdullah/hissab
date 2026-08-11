import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { and, desc, eq, inArray } from 'drizzle-orm';

import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  categories,
  personalLedgers,
  personalTransactions,
  userPreferences,
  users,
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

export interface PersonalTransactionCursor {
  occurredAt: Date;
  rootId: string;
}

export interface PersonalTransactionFilters {
  from: Date | null;
  to: Date | null;
  type?: PersonalTransactionType;
  categoryCode?: string;
}

export interface ReportProfile {
  timezone: string;
  defaultMode: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET';
}

export interface ReportBucketRow {
  type: PersonalTransactionType;
  period: string;
  amountMinor: string;
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
    code: string,
    type: PersonalTransactionType,
  ): Promise<(PersonalCategoryView & { id: string }) | undefined> {
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
          eq(categories.code, code),
          eq(categories.kind, type),
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

  async findCategoryById(
    transaction: DatabaseTransaction,
    categoryId: string,
  ): Promise<(PersonalCategoryView & { id: string }) | undefined> {
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
          eq(categories.id, categoryId),
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
    cursor: PersonalTransactionCursor | null,
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
            $6::timestamptz IS NULL
            OR (personal_transaction.occurred_at, personal_transaction.root_personal_transaction_id)
               < ($6::timestamptz, $7::uuid)
          )
        ORDER BY personal_transaction.occurred_at DESC,
                 personal_transaction.root_personal_transaction_id DESC
        LIMIT $8
      `,
      [
        userId,
        filters.from,
        filters.to,
        filters.type ?? null,
        filters.categoryCode ?? null,
        cursor?.occurredAt ?? null,
        cursor?.rootId ?? null,
        limit,
      ],
    );
    return result.rows.map((row) => this.toView(row));
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

  async findReportProfile(userId: string): Promise<ReportProfile | null> {
    const [profile] = await this.database.db
      .select({
        timezone: users.timezone,
        defaultMode: userPreferences.personalReportMode,
      })
      .from(users)
      .innerJoin(userPreferences, eq(userPreferences.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    return profile ?? null;
  }

  async listReportBuckets(
    userId: string,
    filters: PersonalTransactionFilters,
    mode: 'OWED_SHARE' | 'CASH_OUT_OF_POCKET',
    bucket: 'DAY' | 'MONTH',
    timezone: string,
  ): Promise<ReportBucketRow[]> {
    const allocation =
      mode === 'OWED_SHARE'
        ? { table: 'expense_splits', amount: 'owed_minor' }
        : { table: 'expense_payers', amount: 'amount_minor' };
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
          JOIN ${allocation.table} allocation
            ON allocation.expense_id = expense.id
           AND allocation.user_id = $1::uuid
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
                 allocation.${allocation.amount} AS amount_minor,
                 category.code AS category_code,
                 expense.occurred_at
          FROM ranked_expenses expense
          JOIN ${allocation.table} allocation
            ON allocation.expense_id = expense.id
           AND allocation.user_id = $1::uuid
          JOIN categories category ON category.id = expense.category_id
          WHERE expense.revision_order = 1
            AND expense.status = 'ACTIVE'
        )
        SELECT entry.type,
               CASE WHEN $6::text = 'DAY'
                 THEN to_char(entry.occurred_at AT TIME ZONE $7::text, 'YYYY-MM-DD')
                 ELSE to_char(entry.occurred_at AT TIME ZONE $7::text, 'YYYY-MM')
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
        timezone,
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
