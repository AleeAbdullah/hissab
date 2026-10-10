import {
  personalCreateTransaction,
  personalDeleteTransaction,
  personalGetReport,
  personalGetTransaction,
  personalListHistory,
  personalListCategories,
  personalReplaceTransaction
} from '@/api/generated/sdk.gen';
import type {
  CreatePersonalTransactionDto,
  ReplacePersonalTransactionDto
} from '@/api/generated/types.gen';
import type {
  PersonalCategory,
  PersonalCategoryCode,
  PersonalHistoryPage,
  PersonalReport,
  PersonalTransaction,
  PersonalTransactionType
} from '@/api/contracts';
import { idempotencyKey, request } from '@/api/transport';

export type PersonalFilters = {
  type?: PersonalTransactionType;
  categoryCode?: PersonalCategoryCode;
  search?: string;
  from?: string;
  to?: string;
  minAmountMinor?: string;
  maxAmountMinor?: string;
  includeShared?: 'true' | 'false';
  bucket?: PersonalReport['bucket'];
};

export function personalHistoryInfiniteQuery(
  filters: PersonalFilters,
  limit = 50
) {
  return {
    queryKey: ['personal', 'history', filters, limit] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      request<PersonalHistoryPage>(() =>
        personalListHistory({
          query: { ...filters, cursor: pageParam, limit }
        })
      ),
    getNextPageParam: (page: PersonalHistoryPage) =>
      page.nextCursor ?? undefined
  };
}

export const personalCategoriesQuery = {
  queryKey: ['personal', 'categories'] as const,
  queryFn: () => request<PersonalCategory[]>(() => personalListCategories())
};

export function personalTransactionQuery(transactionId: string) {
  return {
    queryKey: ['personal', 'transactions', transactionId] as const,
    queryFn: () =>
      request<PersonalTransaction>(() =>
        personalGetTransaction({ path: { transactionId } })
      )
  };
}

export function personalReportQuery(filters: PersonalFilters) {
  return {
    queryKey: ['personal', 'report', filters] as const,
    queryFn: () =>
      request<PersonalReport>(() => personalGetReport({ query: filters }))
  };
}

export function createPersonalTransaction(body: CreatePersonalTransactionDto) {
  return request<PersonalTransaction>(() =>
    personalCreateTransaction({
      body,
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}

export function replacePersonalTransaction(
  transactionId: string,
  body: ReplacePersonalTransactionDto
) {
  return request<PersonalTransaction>(() =>
    personalReplaceTransaction({
      path: { transactionId },
      body,
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}

export function deletePersonalTransaction(
  transactionId: string,
  expectedVersion: number
) {
  return request<PersonalTransaction>(() =>
    personalDeleteTransaction({
      path: { transactionId },
      query: { expectedVersion },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}
