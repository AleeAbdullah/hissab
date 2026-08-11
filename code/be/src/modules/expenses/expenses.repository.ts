import { randomUUID } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { and, asc, desc, eq, inArray, isNotNull, ne } from 'drizzle-orm';

import {
  DatabaseService,
  type DatabaseTransaction,
} from '../../database/database.service';
import {
  categories,
  eventAllocations,
  expensePayers,
  expenses,
  expenseSplits,
  financialEvents,
  ledgerMembers,
  ledgerPostings,
  ledgers,
} from '../../database/schema';

export type ExpenseRevisionRow = typeof expenses.$inferSelect;
type EventAllocationRow = typeof eventAllocations.$inferSelect;
type LedgerPostingRow = typeof ledgerPostings.$inferSelect;

export interface ExpenseCategoryView {
  code: string;
  name: string;
}

export interface ExpensePayerView {
  userId: string;
  amountMinor: string;
}

export interface ExpenseParticipantView {
  userId: string;
  owedMinor: string;
  splitMethod: 'EQUAL' | 'EXACT';
}

export interface ExpenseView {
  id: string;
  ledgerId: string;
  createdByUserId: string;
  description: string;
  totalMinor: string;
  category: ExpenseCategoryView;
  occurredAt: Date;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  payers: ExpensePayerView[];
  participants: ExpenseParticipantView[];
  createdAt: Date;
}

export interface ExpenseCursor {
  occurredAt: Date;
  rootId: string;
}

export interface ExpenseAllocation {
  userId: string;
  amountMinor: bigint;
}

export interface ExpenseSplitAllocation extends ExpenseAllocation {
  splitMethod: 'EQUAL' | 'EXACT';
}

export interface FinancialEventAllocation extends ExpenseAllocation {
  role: 'PAYER' | 'PARTICIPANT';
  splitMethod: 'EQUAL' | 'EXACT' | null;
}

export type FinancialEventPosting = ExpenseAllocation;

export interface FinancialEffectSnapshot {
  id: string;
  allocations: EventAllocationRow[];
  postings: LedgerPostingRow[];
}

interface ExpenseReadRow {
  revisionId: string;
  rootExpenseId: string;
  ledgerId: string;
  createdByUserId: string;
  description: string;
  totalMinor: string;
  categoryCode: string;
  categoryName: string;
  occurredAt: Date;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  createdAt: Date;
}

interface InsertRevisionInput {
  rootExpenseId?: string;
  replacesExpenseId?: string;
  ledgerId: string;
  createdByUserId: string;
  description: string;
  totalMinor: bigint;
  categoryId: string;
  occurredAt: Date;
  status: 'ACTIVE' | 'DELETED';
  version: number;
  payers: ExpenseAllocation[];
  splits: ExpenseSplitAllocation[];
}

interface InsertFinancialEventInput {
  ledgerId: string;
  expenseId: string;
  eventType: 'CREATED' | 'REPLACEMENT' | 'REVERSAL';
  reversesEventId?: string;
  createdByUserId: string;
  allocations: FinancialEventAllocation[];
  postings: FinancialEventPosting[];
}

@Injectable()
export class ExpensesRepository {
  constructor(private readonly database: DatabaseService) {}

  async listCategories(): Promise<ExpenseCategoryView[]> {
    const rows = await this.database.db
      .select({ code: categories.code, name: categories.name })
      .from(categories)
      .where(
        and(eq(categories.isSystem, true), eq(categories.kind, 'EXPENSE')),
      );
    return rows.flatMap(({ code, name }) => (code ? [{ code, name }] : []));
  }

  async findCategory(
    transaction: DatabaseTransaction,
    code: string,
  ): Promise<(ExpenseCategoryView & { id: string }) | undefined> {
    const [category] = await transaction
      .select({
        id: categories.id,
        code: categories.code,
        name: categories.name,
      })
      .from(categories)
      .where(
        and(
          eq(categories.code, code),
          eq(categories.isSystem, true),
          eq(categories.kind, 'EXPENSE'),
        ),
      )
      .limit(1);
    return category?.code ? { ...category, code: category.code } : undefined;
  }

  async findCategoryById(
    transaction: DatabaseTransaction,
    categoryId: string,
  ): Promise<(ExpenseCategoryView & { id: string }) | undefined> {
    const [category] = await transaction
      .select({
        id: categories.id,
        code: categories.code,
        name: categories.name,
      })
      .from(categories)
      .where(
        and(
          eq(categories.id, categoryId),
          eq(categories.isSystem, true),
          eq(categories.kind, 'EXPENSE'),
        ),
      )
      .limit(1);
    return category?.code ? { ...category, code: category.code } : undefined;
  }

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
    const [membership] = await transaction
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
    return Boolean(membership);
  }

  async hasJoinedMembership(
    ledgerId: string,
    userId: string,
  ): Promise<boolean> {
    const [membership] = await this.database.db
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
    return Boolean(membership);
  }

  async findActiveMemberIds(
    transaction: DatabaseTransaction,
    ledgerId: string,
    userIds: string[],
  ): Promise<string[]> {
    if (userIds.length === 0) {
      return [];
    }
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

  async lockExpenseChain(
    transaction: DatabaseTransaction,
    rootExpenseId: string,
  ): Promise<ExpenseRevisionRow[]> {
    const [root] = await transaction
      .select({ id: expenses.id })
      .from(expenses)
      .where(
        and(
          eq(expenses.id, rootExpenseId),
          eq(expenses.rootExpenseId, rootExpenseId),
        ),
      )
      .limit(1)
      .for('update');
    if (!root) {
      return [];
    }
    return transaction
      .select()
      .from(expenses)
      .where(eq(expenses.rootExpenseId, rootExpenseId))
      .orderBy(desc(expenses.version))
      .for('update');
  }

  async insertRevision(
    transaction: DatabaseTransaction,
    input: InsertRevisionInput,
  ): Promise<ExpenseRevisionRow> {
    const id = randomUUID();
    const [revision] = await transaction
      .insert(expenses)
      .values({
        id,
        rootExpenseId: input.rootExpenseId ?? id,
        replacesExpenseId: input.replacesExpenseId,
        ledgerId: input.ledgerId,
        createdByUserId: input.createdByUserId,
        description: input.description,
        totalMinor: input.totalMinor,
        categoryId: input.categoryId,
        occurredAt: input.occurredAt,
        status: input.status,
        version: input.version,
      })
      .returning();
    if (!revision) {
      throw new Error('Expense revision insert returned no row.');
    }

    await transaction.insert(expensePayers).values(
      input.payers.map((payer) => ({
        expenseId: revision.id,
        userId: payer.userId,
        amountMinor: payer.amountMinor,
      })),
    );
    await transaction.insert(expenseSplits).values(
      input.splits.map((split) => ({
        expenseId: revision.id,
        userId: split.userId,
        owedMinor: split.amountMinor,
        splitMethod: split.splitMethod,
      })),
    );
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
        expenseId: input.expenseId,
        eventType: input.eventType,
        reversesEventId: input.reversesEventId,
        createdByUserId: input.createdByUserId,
      })
      .returning({ id: financialEvents.id });
    if (!event) {
      throw new Error('Financial event insert returned no row.');
    }

    await transaction.insert(eventAllocations).values(
      input.allocations.map((allocation) => ({
        financialEventId: event.id,
        userId: allocation.userId,
        role: allocation.role,
        amountMinor: allocation.amountMinor,
        splitMethod: allocation.splitMethod,
      })),
    );
    if (input.postings.length > 0) {
      await transaction.insert(ledgerPostings).values(
        input.postings.map((posting) => ({
          financialEventId: event.id,
          userId: posting.userId,
          amountMinor: posting.amountMinor,
        })),
      );
    }
    return event.id;
  }

  async getRevisionAllocations(
    transaction: DatabaseTransaction,
    expenseId: string,
  ): Promise<{
    payers: ExpenseAllocation[];
    splits: ExpenseSplitAllocation[];
  }> {
    const [payers, splits] = await Promise.all([
      transaction
        .select({
          userId: expensePayers.userId,
          amountMinor: expensePayers.amountMinor,
        })
        .from(expensePayers)
        .where(eq(expensePayers.expenseId, expenseId))
        .orderBy(asc(expensePayers.userId)),
      transaction
        .select({
          userId: expenseSplits.userId,
          amountMinor: expenseSplits.owedMinor,
          splitMethod: expenseSplits.splitMethod,
        })
        .from(expenseSplits)
        .where(eq(expenseSplits.expenseId, expenseId))
        .orderBy(asc(expenseSplits.userId)),
    ]);
    return { payers, splits };
  }

  async getEffectSnapshot(
    transaction: DatabaseTransaction,
    expenseId: string,
  ): Promise<FinancialEffectSnapshot | undefined> {
    const [event] = await transaction
      .select({ id: financialEvents.id })
      .from(financialEvents)
      .where(
        and(
          eq(financialEvents.expenseId, expenseId),
          ne(financialEvents.eventType, 'REVERSAL'),
        ),
      )
      .limit(1);
    if (!event) {
      return undefined;
    }
    const [allocations, postings] = await Promise.all([
      transaction
        .select()
        .from(eventAllocations)
        .where(eq(eventAllocations.financialEventId, event.id)),
      transaction
        .select()
        .from(ledgerPostings)
        .where(eq(ledgerPostings.financialEventId, event.id)),
    ]);
    return { id: event.id, allocations, postings };
  }

  async listExpenseViews(
    ledgerId: string,
    cursor: ExpenseCursor | null,
    limit: number,
  ): Promise<ExpenseView[]> {
    const result = await this.database.pool.query<ExpenseReadRow>(
      `
        WITH ranked AS (
          SELECT expense.*,
                 row_number() OVER (
                   PARTITION BY expense.root_expense_id
                   ORDER BY expense.version DESC
                 ) AS revision_order
          FROM expenses expense
          WHERE expense.ledger_id = $1::uuid
        )
        SELECT expense.id AS "revisionId",
               expense.root_expense_id AS "rootExpenseId",
               expense.ledger_id AS "ledgerId",
               expense.created_by_user_id AS "createdByUserId",
               expense.description,
               expense.total_minor::text AS "totalMinor",
               category.code AS "categoryCode",
               category.name AS "categoryName",
               expense.occurred_at AS "occurredAt",
               expense.status,
               expense.version,
               expense.created_at AS "createdAt"
        FROM ranked expense
        JOIN categories category ON category.id = expense.category_id
        WHERE expense.revision_order = 1
          AND (
            $2::timestamptz IS NULL
            OR (expense.occurred_at, expense.root_expense_id)
               < ($2::timestamptz, $3::uuid)
          )
        ORDER BY expense.occurred_at DESC, expense.root_expense_id DESC
        LIMIT $4
      `,
      [ledgerId, cursor?.occurredAt ?? null, cursor?.rootId ?? null, limit],
    );
    return this.attachAllocations(result.rows);
  }

  async findExpenseView(
    userId: string,
    rootExpenseId: string,
  ): Promise<ExpenseView | null> {
    const result = await this.database.pool.query<ExpenseReadRow>(
      `
        SELECT expense.id AS "revisionId",
               expense.root_expense_id AS "rootExpenseId",
               expense.ledger_id AS "ledgerId",
               expense.created_by_user_id AS "createdByUserId",
               expense.description,
               expense.total_minor::text AS "totalMinor",
               category.code AS "categoryCode",
               category.name AS "categoryName",
               expense.occurred_at AS "occurredAt",
               expense.status,
               expense.version,
               expense.created_at AS "createdAt"
        FROM expenses expense
        JOIN categories category ON category.id = expense.category_id
        JOIN ledger_members member
          ON member.ledger_id = expense.ledger_id
         AND member.user_id = $1::uuid
         AND member.joined_at IS NOT NULL
        WHERE expense.root_expense_id = $2::uuid
        ORDER BY expense.version DESC
        LIMIT 1
      `,
      [userId, rootExpenseId],
    );
    const views = await this.attachAllocations(result.rows);
    return views[0] ?? null;
  }

  private async attachAllocations(
    rows: ExpenseReadRow[],
  ): Promise<ExpenseView[]> {
    if (rows.length === 0) {
      return [];
    }
    const expenseIds = rows.map(({ revisionId }) => revisionId);
    const [payerRows, splitRows] = await Promise.all([
      this.database.db
        .select({
          expenseId: expensePayers.expenseId,
          userId: expensePayers.userId,
          amountMinor: expensePayers.amountMinor,
        })
        .from(expensePayers)
        .where(inArray(expensePayers.expenseId, expenseIds))
        .orderBy(asc(expensePayers.userId)),
      this.database.db
        .select({
          expenseId: expenseSplits.expenseId,
          userId: expenseSplits.userId,
          owedMinor: expenseSplits.owedMinor,
          splitMethod: expenseSplits.splitMethod,
        })
        .from(expenseSplits)
        .where(inArray(expenseSplits.expenseId, expenseIds))
        .orderBy(asc(expenseSplits.userId)),
    ]);

    return rows.map((row) => ({
      id: row.rootExpenseId,
      ledgerId: row.ledgerId,
      createdByUserId: row.createdByUserId,
      description: row.description,
      totalMinor: row.totalMinor,
      category: { code: row.categoryCode, name: row.categoryName },
      occurredAt: row.occurredAt,
      status: row.status,
      version: row.version,
      payers: payerRows
        .filter(({ expenseId }) => expenseId === row.revisionId)
        .map(({ userId, amountMinor }) => ({
          userId,
          amountMinor: amountMinor.toString(),
        })),
      participants: splitRows
        .filter(({ expenseId }) => expenseId === row.revisionId)
        .map(({ userId, owedMinor, splitMethod }) => ({
          userId,
          owedMinor: owedMinor.toString(),
          splitMethod,
        })),
      createdAt: row.createdAt,
    }));
  }
}
