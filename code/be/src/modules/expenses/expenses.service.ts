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
import {
  SHARED_EXPENSE_CATEGORY_CODES,
  type CreateExpenseDto,
  type ListExpensesDto,
  type ReplaceExpenseDto,
} from './dto/expenses.dto';
import {
  type ExpenseAllocation,
  type ExpenseCategoryView,
  type ExpenseCursor,
  type ExpenseParticipantView,
  type ExpenseRevisionRow,
  type ExpenseSplitAllocation,
  type ExpenseView,
  type FinancialEffectSnapshot,
  type FinancialEventAllocation,
  type FinancialEventPosting,
  ExpensesRepository,
} from './expenses.repository';

const MAX_MINOR = 9_223_372_036_854_775_807n;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PreparedExpense {
  description: string;
  totalMinor: bigint;
  occurredAt: Date;
  payers: ExpenseAllocation[];
  splits: ExpenseSplitAllocation[];
  memberUserIds: string[];
}

@Injectable()
export class ExpensesService {
  constructor(
    private readonly repository: ExpensesRepository,
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
      .sort((left, right) => order.get(left.code)! - order.get(right.code)!);
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
        await this.requireWritableLedger(transaction, ledgerId, userId);
        const prepared = this.prepareExpense(dto);
        await this.requireActiveAllocationMembers(
          transaction,
          ledgerId,
          prepared,
        );
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
        await this.repository.insertFinancialEvent(transaction, {
          ledgerId,
          expenseId: revision.id,
          eventType: 'CREATED',
          createdByUserId: userId,
          allocations: this.eventAllocations(prepared),
          postings: this.postings(prepared),
        });
        await this.recordChange(
          transaction,
          userId,
          ledgerId,
          revision.rootExpenseId,
          'CREATED',
          revision.version,
          prepared.totalMinor,
        );
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
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('limit must be between 1 and 100.');
    }
    if (!(await this.repository.hasJoinedMembership(ledgerId, userId))) {
      throw new NotFoundException('Ledger not found.');
    }
    const rows = await this.repository.listExpenseViews(
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
        await this.requireActiveAllocationMembers(
          transaction,
          latest.ledgerId,
          prepared,
        );
        const category = await this.requireCategory(
          transaction,
          dto.categoryCode,
        );
        const previousEffect = await this.requireEffect(transaction, latest.id);
        await this.reverseEffect(transaction, userId, latest, previousEffect);
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
        await this.repository.insertFinancialEvent(transaction, {
          ledgerId: latest.ledgerId,
          expenseId: revision.id,
          eventType: 'REPLACEMENT',
          createdByUserId: userId,
          allocations: this.eventAllocations(prepared),
          postings: this.postings(prepared),
        });
        await this.recordChange(
          transaction,
          userId,
          latest.ledgerId,
          rootExpenseId,
          'REPLACED',
          revision.version,
          prepared.totalMinor,
        );
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
        await this.requireActiveUserIds(transaction, latest.ledgerId, [
          ...allocations.payers.map(({ userId }) => userId),
          ...allocations.splits.map(({ userId }) => userId),
        ]);
        const category = await this.repository.findCategoryById(
          transaction,
          latest.categoryId,
        );
        if (!category) {
          throw new Error('Expense category snapshot is missing.');
        }
        const previousEffect = await this.requireEffect(transaction, latest.id);
        await this.reverseEffect(transaction, userId, latest, previousEffect);
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
        await this.recordChange(
          transaction,
          userId,
          latest.ledgerId,
          rootExpenseId,
          'DELETED',
          revision.version,
          latest.totalMinor,
        );
        return this.toView(revision, category, {
          description: latest.description,
          totalMinor: latest.totalMinor,
          occurredAt: latest.occurredAt,
          payers: allocations.payers,
          splits: allocations.splits,
          memberUserIds: [
            ...new Set([
              ...allocations.payers.map(({ userId }) => userId),
              ...allocations.splits.map(({ userId }) => userId),
            ]),
          ],
        });
      },
    );
  }

  private prepareExpense(
    dto: CreateExpenseDto | ReplaceExpenseDto,
  ): PreparedExpense {
    if (
      !dto.split ||
      typeof dto.split !== 'object' ||
      !['EQUAL', 'EXACT'].includes(dto.split.method)
    ) {
      throw new BadRequestException('Split method must be EQUAL or EXACT.');
    }
    const totalMinor = this.parseMinor(dto.totalMinor);
    const description = dto.description.trim();
    if (!description) {
      throw new BadRequestException('Description is required.');
    }
    const occurredAt = new Date(dto.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid date-time.');
    }
    const payers = this.normalizeAllocations(dto.payers);
    if (this.sum(payers) !== totalMinor) {
      throw new BadRequestException('Payer allocations must equal the total.');
    }

    let splits: ExpenseSplitAllocation[];
    let participantUserIds: string[];
    if (dto.split.method === 'EQUAL') {
      const userIds = this.uniqueUserIds(dto.split.participantUserIds);
      if (userIds.length === 0) {
        throw new BadRequestException('At least one participant is required.');
      }
      const base = totalMinor / BigInt(userIds.length);
      const remainder = Number(totalMinor % BigInt(userIds.length));
      splits = userIds.flatMap((userId, index) => {
        const amountMinor = base + (index < remainder ? 1n : 0n);
        return amountMinor > 0n
          ? [{ userId, amountMinor, splitMethod: 'EQUAL' as const }]
          : [];
      });
      participantUserIds = userIds;
    } else {
      splits = this.normalizeAllocations(dto.split.allocations).map(
        (allocation) => ({ ...allocation, splitMethod: 'EXACT' as const }),
      );
      if (this.sum(splits) !== totalMinor) {
        throw new BadRequestException(
          'Participant allocations must equal the total.',
        );
      }
      participantUserIds = splits.map(({ userId }) => userId);
    }
    return {
      description,
      totalMinor,
      occurredAt,
      payers,
      splits,
      memberUserIds: [
        ...new Set([
          ...payers.map(({ userId }) => userId),
          ...participantUserIds,
        ]),
      ],
    };
  }

  private normalizeAllocations(
    allocations: Array<{ userId: string; amountMinor: string }>,
  ): ExpenseAllocation[] {
    if (allocations.length === 0) {
      throw new BadRequestException('At least one allocation is required.');
    }
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
          amountMinor: this.parseMinor(amountMinor),
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

  private parseMinor(value: string): bigint {
    if (!/^[1-9][0-9]*$/.test(value)) {
      throw new BadRequestException(
        'Minor-unit amounts must be positive integer strings.',
      );
    }
    const amount = BigInt(value);
    if (amount > MAX_MINOR) {
      throw new BadRequestException('Minor-unit amount exceeds 64-bit range.');
    }
    return amount;
  }

  private sum(allocations: ExpenseAllocation[]): bigint {
    return allocations.reduce((total, item) => total + item.amountMinor, 0n);
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
    await this.requireWritableLedger(transaction, latest.ledgerId, userId);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(
        'expectedVersion must be a positive integer.',
      );
    }
    if (latest.version !== expectedVersion) {
      throw new ConflictException('Expense version conflict.');
    }
    if (latest.status === 'DELETED') {
      throw new ConflictException('Deleted expenses cannot be changed.');
    }
    return latest;
  }

  private async requireActiveAllocationMembers(
    transaction: DatabaseTransaction,
    ledgerId: string,
    prepared: PreparedExpense,
  ): Promise<void> {
    await this.requireActiveUserIds(
      transaction,
      ledgerId,
      prepared.memberUserIds,
    );
  }

  private async requireActiveUserIds(
    transaction: DatabaseTransaction,
    ledgerId: string,
    userIds: string[],
  ): Promise<void> {
    const unique = [...new Set(userIds)].sort();
    const active = await this.repository.findActiveMemberIds(
      transaction,
      ledgerId,
      unique,
    );
    if (active.length !== unique.length) {
      throw new BadRequestException(
        'All payers and participants must be active ledger members.',
      );
    }
  }

  private async requireCategory(
    transaction: DatabaseTransaction,
    code: string,
  ): Promise<ExpenseCategoryView & { id: string }> {
    const category = await this.repository.findCategory(transaction, code);
    if (!category || !SHARED_EXPENSE_CATEGORY_CODES.includes(code as never)) {
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

  private async reverseEffect(
    transaction: DatabaseTransaction,
    userId: string,
    revision: ExpenseRevisionRow,
    effect: FinancialEffectSnapshot,
  ): Promise<void> {
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
    const participants: ExpenseParticipantView[] = prepared.splits.map(
      (split) => ({
        userId: split.userId,
        owedMinor: split.amountMinor.toString(),
        splitMethod: split.splitMethod,
      }),
    );
    return {
      id: revision.rootExpenseId,
      ledgerId: revision.ledgerId,
      createdByUserId: revision.createdByUserId,
      description: revision.description,
      totalMinor: revision.totalMinor.toString(),
      category,
      occurredAt: revision.occurredAt,
      status: revision.status,
      version: revision.version,
      payers: prepared.payers.map((payer) => ({
        userId: payer.userId,
        amountMinor: payer.amountMinor.toString(),
      })),
      participants,
      createdAt: revision.createdAt,
    };
  }

  private encodeCursor(expense: ExpenseView): string {
    return Buffer.from(
      JSON.stringify([expense.occurredAt.toISOString(), expense.id]),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): ExpenseCursor {
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
      throw new BadRequestException('Invalid expense cursor.');
    }
  }

  private async recordChange(
    transaction: DatabaseTransaction,
    actorUserId: string,
    ledgerId: string,
    expenseId: string,
    eventType: 'CREATED' | 'REPLACED' | 'DELETED',
    version: number,
    totalMinor: bigint,
  ): Promise<void> {
    const payload = { version, totalMinor: totalMinor.toString() };
    await transaction.insert(activityEvents).values({
      actorUserId,
      ledgerId,
      eventType: `EXPENSE_${eventType}`,
      aggregateType: 'EXPENSE',
      aggregateId: expenseId,
      payload,
    });
    await this.outbox.enqueue(transaction, {
      eventType: `expense.${eventType.toLowerCase()}`,
      aggregateType: 'expense',
      aggregateId: expenseId,
      payload: { actorUserId, ledgerId, ...payload },
    });
  }
}
