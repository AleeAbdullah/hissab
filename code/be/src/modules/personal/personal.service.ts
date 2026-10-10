import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

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
  type PersonalCategoryView,
  type PersonalTransactionCursor,
  type PersonalTransactionFilters,
  type PersonalHistoryItemView,
  type PersonalTransactionRevision,
  type PersonalTransactionView,
  PersonalRepository,
} from './personal.repository';

const MAX_MINOR = 9_223_372_036_854_775_807n;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface PreparedPersonalTransaction {
  type: PersonalTransactionType;
  amountMinor: bigint;
  description: string;
  merchantOrSource: string | null;
  occurredAt: Date;
  notes: string | null;
}

export interface PersonalReportView {
  bucket: 'DAY' | 'MONTH';
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
  buckets: Array<{
    period: string;
    incomeMinor: string;
    expenseMinor: string;
    netMinor: string;
  }>;
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
      (left, right) => order.get(left.code)! - order.get(right.code)!,
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
    const filters = this.filters(query);
    const { minAmountMinor, maxAmountMinor } = this.amountFilters(query);
    const limit = query.limit ?? 50;
    const [rows, largestAmountMinor] = await Promise.all([
      this.repository.listTransactions(
        userId,
        {
          ...filters,
          search: query.search?.trim() || undefined,
          minAmountMinor,
          maxAmountMinor,
        },
        query.cursor ? this.decodeCursor(query.cursor) : null,
        limit + 1,
      ),
      this.repository.maxTransactionAmountMinor(userId),
    ]);
    const items = rows.slice(0, limit);
    return {
      items,
      nextCursor:
        rows.length > limit && items.length > 0
          ? this.encodeCursor(items[items.length - 1])
          : null,
      maxAmountMinor: largestAmountMinor,
    };
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
    const { minAmountMinor, maxAmountMinor } = this.amountFilters(query);
    const bucket = query.bucket ?? 'MONTH';
    const limit = query.limit ?? 50;
    const result = await this.repository.listHistory(
      userId,
      {
        ...this.filters(query),
        search: query.search?.trim() || undefined,
        minAmountMinor,
        maxAmountMinor,
      },
      query.includeShared !== 'false',
      bucket,
      query.cursor ? this.decodeCursor(query.cursor) : null,
      limit + 1,
    );
    const items = result.items.slice(0, limit);
    return {
      items,
      nextCursor:
        result.items.length > limit && items.length > 0
          ? this.encodeCursor(items[items.length - 1])
          : null,
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
        const category = await this.repository.findCategoryById(
          transaction,
          latest.categoryId,
        );
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
    const filters = this.filters(query);
    const bucket = query.bucket ?? 'MONTH';
    const rows = await this.repository.listReportBuckets(
      userId,
      filters,
      query.includeShared !== 'false',
      bucket,
    );
    const report: Omit<PersonalReportView, 'bucket'> = {
      incomeMinor: '0',
      expenseMinor: '0',
      netMinor: '0',
      buckets: [],
    };
    for (const row of rows) {
      let period = report.buckets.find(
        (candidate) => candidate.period === row.period,
      );
      if (!period) {
        period = {
          period: row.period,
          incomeMinor: '0',
          expenseMinor: '0',
          netMinor: '0',
        };
        report.buckets.push(period);
      }
      if (row.type === 'INCOME') {
        period.incomeMinor = row.amountMinor;
        report.incomeMinor = (
          BigInt(report.incomeMinor) + BigInt(row.amountMinor)
        ).toString();
      } else {
        period.expenseMinor = row.amountMinor;
        report.expenseMinor = (
          BigInt(report.expenseMinor) + BigInt(row.amountMinor)
        ).toString();
      }
      period.netMinor = (
        BigInt(period.incomeMinor) - BigInt(period.expenseMinor)
      ).toString();
      report.netMinor = (
        BigInt(report.incomeMinor) - BigInt(report.expenseMinor)
      ).toString();
    }
    return {
      bucket,
      ...report,
      buckets: report.buckets.sort((left, right) =>
        left.period.localeCompare(right.period),
      ),
    };
  }

  private prepare(
    dto: CreatePersonalTransactionDto | ReplacePersonalTransactionDto,
  ): PreparedPersonalTransaction {
    if (!/^[1-9][0-9]*$/.test(dto.amountMinor)) {
      throw new BadRequestException(
        'Minor-unit amount must be a positive integer string.',
      );
    }
    const amountMinor = BigInt(dto.amountMinor);
    if (amountMinor > MAX_MINOR) {
      throw new BadRequestException('Minor-unit amount exceeds 64-bit range.');
    }
    const description = dto.description.trim();
    if (!description || description.length > 200) {
      throw new BadRequestException(
        'Description must be between 1 and 200 characters.',
      );
    }
    const merchantOrSource = this.optionalText(
      dto.merchantOrSource,
      200,
      'merchantOrSource',
    );
    const notes = this.optionalText(dto.notes, 2000, 'notes');
    const occurredAt = new Date(dto.occurredAt);
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('occurredAt must be a valid date-time.');
    }
    if (dto.type !== 'INCOME' && dto.type !== 'EXPENSE') {
      throw new BadRequestException('type must be INCOME or EXPENSE.');
    }
    return {
      type: dto.type,
      amountMinor,
      description,
      merchantOrSource,
      occurredAt,
      notes,
    };
  }

  private optionalText(
    value: string | null | undefined,
    maxLength: number,
    name: string,
  ): string | null {
    if (value === null || value === undefined) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed || trimmed.length > maxLength) {
      throw new BadRequestException(
        `${name} must be between 1 and ${maxLength} characters when provided.`,
      );
    }
    return trimmed;
  }

  private async requireCategory(
    transaction: DatabaseTransaction,
    code: string,
    type: PersonalTransactionType,
  ): Promise<PersonalCategoryView & { id: string }> {
    const category = await this.repository.findCategory(
      transaction,
      code,
      type,
    );
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
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) {
      throw new BadRequestException(
        'expectedVersion must be a positive integer.',
      );
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
  }): PersonalTransactionFilters {
    const from = query.from ? new Date(query.from) : null;
    const to = query.to ? new Date(query.to) : null;
    if (
      (from && Number.isNaN(from.getTime())) ||
      (to && Number.isNaN(to.getTime()))
    ) {
      throw new BadRequestException('Date filters must be valid date-times.');
    }
    if (from && to && from >= to) {
      throw new BadRequestException('from must be earlier than to.');
    }
    return {
      from,
      to,
      type: query.type,
      categoryCode: query.categoryCode,
    };
  }

  private amountFilters(query: {
    minAmountMinor?: string;
    maxAmountMinor?: string;
  }): { minAmountMinor?: bigint; maxAmountMinor?: bigint } {
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
    return { minAmountMinor, maxAmountMinor };
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

  private encodeCursor(transaction: {
    occurredAt: Date | string;
    id: string;
  }): string {
    return Buffer.from(
      JSON.stringify([
        new Date(transaction.occurredAt).toISOString(),
        transaction.id,
      ]),
    ).toString('base64url');
  }

  private decodeCursor(cursor: string): PersonalTransactionCursor {
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
      throw new BadRequestException('Invalid personal transaction cursor.');
    }
  }
}
