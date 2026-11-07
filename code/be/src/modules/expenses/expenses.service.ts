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
import {
  SHARED_EXPENSE_CATEGORY_CODES,
  type CreateExpenseDto,
  type ListExpensesDto,
  type ReplaceExpenseDto,
} from './dto/expenses.dto';
import {
  type ExpenseAllocation,
  type ExpenseCategory,
  type ExpenseCategoryView,
  type ExpenseRevisionRow,
  type ExpenseSplitAllocation,
  type ExpenseView,
  type FinancialEffectSnapshot,
  type FinancialEventAllocation,
  type FinancialEventPosting,
  ExpensesRepository,
} from './expenses.repository';

interface PreparedExpense {
  description: string;
  totalMinor: bigint;
  occurredAt: Date;
  payers: ExpenseAllocation[];
  splits: ExpenseSplitAllocation[];
}

type ExpenseChange = 'CREATED' | 'REPLACED' | 'DELETED';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly repository: ExpensesRepository,
    private readonly ledgers: LedgerAccessRepository,
    private readonly idempotency: IdempotencyService,
    private readonly outbox: OutboxService,
  ) {}

  async listCategories(): Promise<ExpenseCategoryView[]> {
    const categories = await this.repository.listCategories();
    const order = new Map<string, number>(
      SHARED_EXPENSE_CATEGORY_CODES.map((code, index) => [code, index]),
    );
    return categories
      .filter(({ code }) => order.has(code))
      .sort(
        (left, right) =>
          (order.get(left.code) ?? 0) - (order.get(right.code) ?? 0),
      );
  }

  createExpense(
    userId: string,
    ledgerId: string,
    idempotencyKey: string,
    dto: CreateExpenseDto,
  ): Promise<ExpenseView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { ledgerId, ...dto },
        responseStatus: 201,
        routeScope: 'expenses:create',
      },
      async (transaction) => {
        await this.ledgers.requireWritableLedger(transaction, ledgerId, userId);
        const prepared = this.prepareExpense(dto);
        await this.requireActiveMembers(transaction, ledgerId, prepared);
        const category = await this.requireCategory(
          transaction,
          dto.categoryCode,
        );
        const revision = await this.repository.insertRevision(transaction, {
          ledgerId,
          createdByUserId: userId,
          description: prepared.description,
          totalMinor: prepared.totalMinor,
          categoryId: category.id,
          occurredAt: prepared.occurredAt,
          status: 'ACTIVE',
          version: 1,
          payers: prepared.payers,
          splits: prepared.splits,
        });
        await this.applyEffect(transaction, userId, revision, prepared);
        await this.recordChange(transaction, userId, revision, 'CREATED');
        return this.toView(revision, category, prepared);
      },
    );
  }

  async listExpenses(
    userId: string,
    ledgerId: string,
    query: ListExpensesDto,
  ): Promise<{ items: ExpenseView[]; nextCursor: string | null }> {
    const limit = query.limit ?? 50;
    await this.ledgers.requireJoinedMembership(ledgerId, userId);
    const rows = await this.repository.listExpenseViews(
      ledgerId,
      query.cursor ? decodeOccurrenceCursor(query.cursor, 'expense') : null,
      limit + 1,
    );
    return pageOf(rows, limit, encodeOccurrenceCursor);
  }

  async getExpense(userId: string, expenseId: string): Promise<ExpenseView> {
    const expense = await this.repository.findExpenseView(userId, expenseId);
    if (!expense) {
      throw new NotFoundException('Expense not found.');
    }
    return expense;
  }

  replaceExpense(
    userId: string,
    rootExpenseId: string,
    idempotencyKey: string,
    dto: ReplaceExpenseDto,
  ): Promise<ExpenseView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { expenseId: rootExpenseId, ...dto },
        responseStatus: 200,
        routeScope: 'expenses:replace',
      },
      async (transaction) => {
        const latest = await this.requireMutableExpense(
          transaction,
          rootExpenseId,
          userId,
          dto.expectedVersion,
        );
        const prepared = this.prepareExpense(dto);
        await this.requireActiveMembers(transaction, latest.ledgerId, prepared);
        const category = await this.requireCategory(
          transaction,
          dto.categoryCode,
        );
        await this.reverseEffect(transaction, userId, latest);
        const revision = await this.repository.insertRevision(transaction, {
          rootExpenseId: latest.rootExpenseId,
          replacesExpenseId: latest.id,
          ledgerId: latest.ledgerId,
          createdByUserId: latest.createdByUserId,
          description: prepared.description,
          totalMinor: prepared.totalMinor,
          categoryId: category.id,
          occurredAt: prepared.occurredAt,
          status: 'ACTIVE',
          version: latest.version + 1,
          payers: prepared.payers,
          splits: prepared.splits,
        });
        await this.applyEffect(transaction, userId, revision, prepared);
        await this.recordChange(transaction, userId, revision, 'REPLACED');
        return this.toView(revision, category, prepared);
      },
    );
  }

  deleteExpense(
    userId: string,
    rootExpenseId: string,
    idempotencyKey: string,
    expectedVersion: number,
  ): Promise<ExpenseView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { expenseId: rootExpenseId, expectedVersion },
        responseStatus: 200,
        routeScope: 'expenses:delete',
      },
      async (transaction) => {
        const latest = await this.requireMutableExpense(
          transaction,
          rootExpenseId,
          userId,
          expectedVersion,
        );
        const allocations = await this.repository.getRevisionAllocations(
          transaction,
          latest.id,
        );
        const snapshot: PreparedExpense = {
          description: latest.description,
          totalMinor: latest.totalMinor,
          occurredAt: latest.occurredAt,
          ...allocations,
        };
        await this.requireActiveMembers(transaction, latest.ledgerId, snapshot);
        const category = await this.repository.findCategory(transaction, {
          id: latest.categoryId,
        });
        if (!category) {
          throw new Error('Expense category snapshot is missing.');
        }
        await this.reverseEffect(transaction, userId, latest);
        const revision = await this.repository.insertRevision(transaction, {
          rootExpenseId: latest.rootExpenseId,
          replacesExpenseId: latest.id,
          ledgerId: latest.ledgerId,
          createdByUserId: latest.createdByUserId,
          description: latest.description,
          totalMinor: latest.totalMinor,
          categoryId: latest.categoryId,
          occurredAt: latest.occurredAt,
          status: 'DELETED',
          version: latest.version + 1,
          payers: allocations.payers,
          splits: allocations.splits,
        });
        await this.recordChange(transaction, userId, revision, 'DELETED');
        return this.toView(revision, category, snapshot);
      },
    );
  }

  private prepareExpense(
    dto: CreateExpenseDto | ReplaceExpenseDto,
  ): PreparedExpense {
    const totalMinor = parseMinorAmount(dto.totalMinor);
    const payers = this.normalizeAllocations(dto.payers);
    if (this.sum(payers) !== totalMinor) {
      throw new BadRequestException('Payer allocations must equal the total.');
    }

    let splits: ExpenseSplitAllocation[];
    if (dto.split.method === 'EQUAL') {
      const userIds = this.uniqueUserIds(dto.split.participantUserIds);
      const base = totalMinor / BigInt(userIds.length);
      const remainder = Number(totalMinor % BigInt(userIds.length));
      splits = userIds.flatMap((userId, index) => {
        const amountMinor = base + (index < remainder ? 1n : 0n);
        return amountMinor > 0n
          ? [{ userId, amountMinor, splitMethod: 'EQUAL' as const }]
          : [];
      });
    } else {
      splits = this.normalizeAllocations(dto.split.allocations).map(
        (allocation) => ({ ...allocation, splitMethod: 'EXACT' as const }),
      );
      if (this.sum(splits) !== totalMinor) {
        throw new BadRequestException(
          'Participant allocations must equal the total.',
        );
      }
    }
    return {
      description: dto.description,
      totalMinor,
      occurredAt: new Date(dto.occurredAt),
      payers,
      splits,
    };
  }

  private normalizeAllocations(
    allocations: Array<{ userId: string; amountMinor: string }>,
  ): ExpenseAllocation[] {
    const seen = new Set<string>();
    return allocations
      .map(({ userId, amountMinor }) => {
        const normalizedUserId = userId.toLowerCase();
        if (seen.has(normalizedUserId)) {
          throw new BadRequestException('Allocation users must be unique.');
        }
        seen.add(normalizedUserId);
        return {
          userId: normalizedUserId,
          amountMinor: parseMinorAmount(amountMinor),
        };
      })
      .sort((left, right) => left.userId.localeCompare(right.userId));
  }

  private uniqueUserIds(userIds: string[]): string[] {
    const normalized = userIds.map((userId) => userId.toLowerCase());
    if (new Set(normalized).size !== normalized.length) {
      throw new BadRequestException('Participant users must be unique.');
    }
    return normalized.sort();
  }

  private sum(allocations: ExpenseAllocation[]): bigint {
    return allocations.reduce((total, item) => total + item.amountMinor, 0n);
  }

  private memberUserIds(prepared: PreparedExpense): string[] {
    return [
      ...new Set([
        ...prepared.payers.map(({ userId }) => userId),
        ...prepared.splits.map(({ userId }) => userId),
      ]),
    ];
  }

  private requireActiveMembers(
    transaction: DatabaseTransaction,
    ledgerId: string,
    prepared: PreparedExpense,
  ): Promise<void> {
    return this.ledgers.requireActiveMembers(
      transaction,
      ledgerId,
      this.memberUserIds(prepared),
      'All payers and participants must be active ledger members.',
    );
  }

  private eventAllocations(
    prepared: PreparedExpense,
  ): FinancialEventAllocation[] {
    return [
      ...prepared.payers.map((payer) => ({
        ...payer,
        role: 'PAYER' as const,
        splitMethod: null,
      })),
      ...prepared.splits.map((split) => ({
        userId: split.userId,
        amountMinor: split.amountMinor,
        role: 'PARTICIPANT' as const,
        splitMethod: split.splitMethod,
      })),
    ];
  }

  // A user's net posting is paid minus owed; zero nets are omitted.
  private postings(prepared: PreparedExpense): FinancialEventPosting[] {
    const net = new Map<string, bigint>();
    for (const payer of prepared.payers) {
      net.set(payer.userId, (net.get(payer.userId) ?? 0n) + payer.amountMinor);
    }
    for (const split of prepared.splits) {
      net.set(split.userId, (net.get(split.userId) ?? 0n) - split.amountMinor);
    }
    return [...net]
      .filter(([, amountMinor]) => amountMinor !== 0n)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([userId, amountMinor]) => ({ userId, amountMinor }));
  }

  private async requireMutableExpense(
    transaction: DatabaseTransaction,
    rootExpenseId: string,
    userId: string,
    expectedVersion: number,
  ): Promise<ExpenseRevisionRow> {
    const [latest] = await this.repository.lockExpenseChain(
      transaction,
      rootExpenseId,
    );
    if (!latest || latest.createdByUserId !== userId) {
      throw new NotFoundException('Expense not found.');
    }
    await this.ledgers.requireWritableLedger(
      transaction,
      latest.ledgerId,
      userId,
    );
    if (latest.version !== expectedVersion) {
      throw new ConflictException('Expense version conflict.');
    }
    if (latest.status === 'DELETED') {
      throw new ConflictException('Deleted expenses cannot be changed.');
    }
    return latest;
  }

  private async requireCategory(
    transaction: DatabaseTransaction,
    code: string,
  ): Promise<ExpenseCategory> {
    const category = await this.repository.findCategory(transaction, { code });
    if (!category) {
      throw new NotFoundException('Shared expense category not found.');
    }
    return category;
  }

  private async requireEffect(
    transaction: DatabaseTransaction,
    expenseId: string,
  ): Promise<FinancialEffectSnapshot> {
    const effect = await this.repository.getEffectSnapshot(
      transaction,
      expenseId,
    );
    if (!effect) {
      throw new Error('Expense effect snapshot is missing.');
    }
    return effect;
  }

  private applyEffect(
    transaction: DatabaseTransaction,
    userId: string,
    revision: ExpenseRevisionRow,
    prepared: PreparedExpense,
  ): Promise<string> {
    return this.repository.insertFinancialEvent(transaction, {
      ledgerId: revision.ledgerId,
      expenseId: revision.id,
      eventType: revision.version === 1 ? 'CREATED' : 'REPLACEMENT',
      createdByUserId: userId,
      allocations: this.eventAllocations(prepared),
      postings: this.postings(prepared),
    });
  }

  private async reverseEffect(
    transaction: DatabaseTransaction,
    userId: string,
    revision: ExpenseRevisionRow,
  ): Promise<void> {
    const effect = await this.requireEffect(transaction, revision.id);
    await this.repository.insertFinancialEvent(transaction, {
      ledgerId: revision.ledgerId,
      expenseId: revision.id,
      eventType: 'REVERSAL',
      reversesEventId: effect.id,
      createdByUserId: userId,
      allocations: effect.allocations.map((allocation) => ({
        userId: allocation.userId,
        amountMinor: allocation.amountMinor,
        role: allocation.role,
        splitMethod: allocation.splitMethod,
      })),
      postings: effect.postings.map((posting) => ({
        userId: posting.userId,
        amountMinor: -posting.amountMinor,
      })),
    });
  }

  private toView(
    revision: ExpenseRevisionRow,
    category: ExpenseCategoryView,
    prepared: PreparedExpense,
  ): ExpenseView {
    return {
      id: revision.rootExpenseId,
      ledgerId: revision.ledgerId,
      createdByUserId: revision.createdByUserId,
      description: revision.description,
      totalMinor: revision.totalMinor.toString(),
      category: { code: category.code, name: category.name },
      occurredAt: revision.occurredAt,
      status: revision.status,
      version: revision.version,
      payers: prepared.payers.map((payer) => ({
        userId: payer.userId,
        amountMinor: payer.amountMinor.toString(),
      })),
      participants: prepared.splits.map((split) => ({
        userId: split.userId,
        owedMinor: split.amountMinor.toString(),
        splitMethod: split.splitMethod,
      })),
      createdAt: revision.createdAt,
    };
  }

  private recordChange(
    transaction: DatabaseTransaction,
    actorUserId: string,
    revision: ExpenseRevisionRow,
    eventType: ExpenseChange,
  ): Promise<void> {
    return recordDomainChange(transaction, this.outbox, {
      actorUserId,
      aggregate: 'EXPENSE',
      aggregateId: revision.rootExpenseId,
      eventType,
      ledgerId: revision.ledgerId,
      payload: {
        version: revision.version,
        totalMinor: revision.totalMinor.toString(),
      },
    });
  }
}
