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
import { MAX_MINOR, parseMinorAmount } from '../../common/minor-units';
import type { DatabaseTransaction } from '../../database/database.service';
import { IdempotencyService } from '../idempotency';
import {
  PERSONAL_CATEGORY_CODES,
  type CreatePersonalTransactionDto,
  type ListPersonalHistoryDto,
  type ListPersonalTransactionsDto,
  type PersonalReportDto,
  type PersonalTransactionType,
  type ReplacePersonalTransactionDto,
} from './personal.dto';
import {
  type PersonalCategory,
  type PersonalCategoryView,
  type PersonalHistoryItemView,
  type PersonalTransactionFilters,
  type PersonalTransactionRevision,
  type PersonalTransactionView,
  PersonalRepository,
} from './personal.repository';

interface PreparedPersonalTransaction {
  type: PersonalTransactionType;
  amountMinor: bigint;
  description: string;
  merchantOrSource: string | null;
  occurredAt: Date;
  notes: string | null;
}

interface ReportBucket {
  period: string;
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
}

export interface PersonalReportView {
  bucket: 'DAY' | 'MONTH';
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
  buckets: ReportBucket[];
}

@Injectable()
export class PersonalService {
  constructor(
    private readonly repository: PersonalRepository,
    private readonly idempotency: IdempotencyService,
  ) {}

  async listCategories(): Promise<PersonalCategoryView[]> {
    const order = new Map<string, number>(
      PERSONAL_CATEGORY_CODES.map((code, index) => [code, index]),
    );
    return (await this.repository.listCategories()).sort(
      (left, right) =>
        (order.get(left.code) ?? 0) - (order.get(right.code) ?? 0),
    );
  }

  createTransaction(
    userId: string,
    idempotencyKey: string,
    dto: CreatePersonalTransactionDto,
  ): Promise<PersonalTransactionView> {
    const prepared = this.prepare(dto);
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: dto,
        responseStatus: 201,
        routeScope: 'personal-transactions:create',
      },
      async (transaction) => {
        const personalLedgerId = await this.repository.ensureAndLockLedger(
          transaction,
          userId,
        );
        const category = await this.requireCategory(
          transaction,
          dto.categoryCode,
          prepared.type,
        );
        const revision = await this.repository.insertRevision(transaction, {
          personalLedgerId,
          ...prepared,
          categoryId: category.id,
          status: 'ACTIVE',
          version: 1,
        });
        return this.toView(revision, category);
      },
    );
  }

  async listTransactions(
    userId: string,
    query: ListPersonalTransactionsDto,
  ): Promise<{
    items: PersonalTransactionView[];
    nextCursor: string | null;
    maxAmountMinor: string | null;
  }> {
    const limit = query.limit ?? 50;
    const [rows, maxAmountMinor] = await Promise.all([
      this.repository.listTransactions(
        userId,
        this.filters(query),
        query.cursor
          ? decodeOccurrenceCursor(query.cursor, 'personal transaction')
          : null,
        limit + 1,
      ),
      this.repository.maxTransactionAmountMinor(userId),
    ]);
    return { ...pageOf(rows, limit, encodeOccurrenceCursor), maxAmountMinor };
  }

  async listHistory(
    userId: string,
    query: ListPersonalHistoryDto,
  ): Promise<{
    items: PersonalHistoryItemView[];
    nextCursor: string | null;
    maxAmountMinor: string | null;
    report: PersonalReportView;
  }> {
    const bucket = query.bucket ?? 'MONTH';
    const limit = query.limit ?? 50;
    const result = await this.repository.listHistory(
      userId,
      this.filters(query),
      query.includeShared !== 'false',
      bucket,
      query.cursor
        ? decodeOccurrenceCursor(query.cursor, 'personal transaction')
        : null,
      limit + 1,
    );
    return {
      ...pageOf(result.items, limit, encodeOccurrenceCursor),
      maxAmountMinor: result.maxAmountMinor,
      report: {
        bucket,
        incomeMinor: result.incomeMinor,
        expenseMinor: result.expenseMinor,
        netMinor: result.netMinor,
        buckets: result.buckets,
      },
    };
  }

  async getTransaction(
    userId: string,
    rootPersonalTransactionId: string,
  ): Promise<PersonalTransactionView> {
    const transaction = await this.repository.findTransaction(
      userId,
      rootPersonalTransactionId,
    );
    if (!transaction) {
      throw new NotFoundException('Personal transaction not found.');
    }
    return transaction;
  }

  replaceTransaction(
    userId: string,
    rootPersonalTransactionId: string,
    idempotencyKey: string,
    dto: ReplacePersonalTransactionDto,
  ): Promise<PersonalTransactionView> {
    const prepared = this.prepare(dto);
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { transactionId: rootPersonalTransactionId, ...dto },
        responseStatus: 200,
        routeScope: 'personal-transactions:replace',
        authorizeReplay: (transaction) =>
          this.authorizeOwnedReplay(
            transaction,
            userId,
            rootPersonalTransactionId,
          ),
      },
      async (transaction) => {
        const latest = await this.requireMutable(
          transaction,
          userId,
          rootPersonalTransactionId,
          dto.expectedVersion,
        );
        const category = await this.requireCategory(
          transaction,
          dto.categoryCode,
          prepared.type,
        );
        const revision = await this.repository.insertRevision(transaction, {
          rootPersonalTransactionId: latest.rootPersonalTransactionId,
          replacesPersonalTransactionId: latest.id,
          personalLedgerId: latest.personalLedgerId,
          ...prepared,
          categoryId: category.id,
          status: 'ACTIVE',
          version: latest.version + 1,
        });
        return this.toView(revision, category);
      },
    );
  }

  deleteTransaction(
    userId: string,
    rootPersonalTransactionId: string,
    idempotencyKey: string,
    expectedVersion: number,
  ): Promise<PersonalTransactionView> {
    return this.idempotency.execute(
      {
        actor: { kind: 'user', subject: userId, userId },
        key: idempotencyKey,
        request: { transactionId: rootPersonalTransactionId, expectedVersion },
        responseStatus: 200,
        routeScope: 'personal-transactions:delete',
        authorizeReplay: (transaction) =>
          this.authorizeOwnedReplay(
            transaction,
            userId,
            rootPersonalTransactionId,
          ),
      },
      async (transaction) => {
        const latest = await this.requireMutable(
          transaction,
          userId,
          rootPersonalTransactionId,
          expectedVersion,
        );
        const category = await this.repository.findCategory(transaction, {
          id: latest.categoryId,
        });
        if (!category || category.kind !== latest.type) {
          throw new Error('Personal transaction category snapshot is missing.');
        }
        const revision = await this.repository.insertRevision(transaction, {
          rootPersonalTransactionId: latest.rootPersonalTransactionId,
          replacesPersonalTransactionId: latest.id,
          personalLedgerId: latest.personalLedgerId,
          type: latest.type,
          amountMinor: latest.amountMinor,
          categoryId: latest.categoryId,
          description: latest.description,
          merchantOrSource: latest.merchantOrSource,
          occurredAt: latest.occurredAt,
          notes: latest.notes,
          status: 'DELETED',
          version: latest.version + 1,
        });
        return this.toView(revision, category);
      },
    );
  }

  async getReport(
    userId: string,
    query: PersonalReportDto,
  ): Promise<PersonalReportView> {
    const bucket = query.bucket ?? 'MONTH';
    const rows = await this.repository.listReportBuckets(
      userId,
      this.filters(query),
      query.includeShared !== 'false',
      bucket,
    );
    const buckets = new Map<string, { income: bigint; expense: bigint }>();
    let income = 0n;
    let expense = 0n;
    for (const row of rows) {
      const amount = BigInt(row.amountMinor);
      const period = buckets.get(row.period) ?? { income: 0n, expense: 0n };
      if (row.type === 'INCOME') {
        period.income += amount;
        income += amount;
      } else {
        period.expense += amount;
        expense += amount;
      }
      buckets.set(row.period, period);
    }
    return {
      bucket,
      incomeMinor: income.toString(),
      expenseMinor: expense.toString(),
      netMinor: (income - expense).toString(),
      buckets: [...buckets]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([period, totals]) => ({
          period,
          incomeMinor: totals.income.toString(),
          expenseMinor: totals.expense.toString(),
          netMinor: (totals.income - totals.expense).toString(),
        })),
    };
  }

  private prepare(
    dto: CreatePersonalTransactionDto | ReplacePersonalTransactionDto,
  ): PreparedPersonalTransaction {
    return {
      type: dto.type,
      amountMinor: parseMinorAmount(dto.amountMinor),
      description: dto.description,
      merchantOrSource: dto.merchantOrSource ?? null,
      occurredAt: new Date(dto.occurredAt),
      notes: dto.notes ?? null,
    };
  }

  private async requireCategory(
    transaction: DatabaseTransaction,
    code: string,
    type: PersonalTransactionType,
  ): Promise<PersonalCategory> {
    const category = await this.repository.findCategory(transaction, {
      code,
      type,
    });
    if (!category) {
      throw new BadRequestException(
        'Category must be an approved system category compatible with the transaction type.',
      );
    }
    return category;
  }

  private async requireMutable(
    transaction: DatabaseTransaction,
    userId: string,
    rootPersonalTransactionId: string,
    expectedVersion: number,
  ): Promise<PersonalTransactionRevision> {
    const [latest] = await this.repository.lockTransactionChain(
      transaction,
      userId,
      rootPersonalTransactionId,
    );
    if (!latest) {
      throw new NotFoundException('Personal transaction not found.');
    }
    if (latest.version !== expectedVersion) {
      throw new ConflictException('Personal transaction version conflict.');
    }
    if (latest.status === 'DELETED') {
      throw new ConflictException(
        'Deleted personal transactions cannot be changed.',
      );
    }
    return latest;
  }

  private async authorizeOwnedReplay(
    transaction: DatabaseTransaction,
    userId: string,
    rootPersonalTransactionId: string,
  ): Promise<void> {
    if (
      !(await this.repository.hasOwnedTransaction(
        transaction,
        userId,
        rootPersonalTransactionId,
      ))
    ) {
      throw new NotFoundException('Personal transaction not found.');
    }
  }

  private filters(query: {
    from?: string;
    to?: string;
    type?: PersonalTransactionType;
    categoryCode?: string;
    search?: string;
    minAmountMinor?: string;
    maxAmountMinor?: string;
  }): PersonalTransactionFilters {
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;
    if (from && to && from >= to) {
      throw new BadRequestException('from must be earlier than to.');
    }
    const minAmountMinor = query.minAmountMinor
      ? BigInt(query.minAmountMinor)
      : undefined;
    const maxAmountMinor = query.maxAmountMinor
      ? BigInt(query.maxAmountMinor)
      : undefined;
    if (
      (minAmountMinor !== undefined && minAmountMinor > MAX_MINOR) ||
      (maxAmountMinor !== undefined && maxAmountMinor > MAX_MINOR) ||
      (minAmountMinor !== undefined &&
        maxAmountMinor !== undefined &&
        minAmountMinor > maxAmountMinor)
    ) {
      throw new BadRequestException('Amount filters are invalid.');
    }
    return {
      from,
      to,
      type: query.type,
      categoryCode: query.categoryCode,
      search: query.search?.trim() || undefined,
      minAmountMinor,
      maxAmountMinor,
    };
  }

  private toView(
    revision: PersonalTransactionRevision,
    category: PersonalCategoryView,
  ): PersonalTransactionView {
    return {
      id: revision.rootPersonalTransactionId,
      type: revision.type,
      amountMinor: revision.amountMinor.toString(),
      category: { code: category.code, name: category.name },
      description: revision.description,
      merchantOrSource: revision.merchantOrSource,
      occurredAt: revision.occurredAt,
      notes: revision.notes,
      status: revision.status,
      version: revision.version,
      createdAt: revision.createdAt,
    };
  }
}
