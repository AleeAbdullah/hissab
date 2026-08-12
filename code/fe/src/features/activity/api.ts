import { activityList } from '@/api/generated/sdk.gen';
import type { ActivityArea, ActivityPage } from '@/api/contracts';
import { request } from '@/api/transport';

export type ActivityFilters = {
  area?: ActivityArea;
  ledgerId?: string;
};

export function activityInfiniteQuery(filters: ActivityFilters) {
  return {
    queryKey: [
      'activity',
      filters.area ?? null,
      filters.ledgerId ?? null
    ] as const,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      request<ActivityPage>(() =>
        activityList({ query: { ...filters, cursor: pageParam, limit: 50 } })
      ),
    getNextPageParam: (page: ActivityPage) => page.nextCursor ?? undefined
  };
}

export function activityAreaFromParam(
  value: string | string[] | undefined
): ActivityArea | undefined {
  return typeof value === 'string' &&
    ['EXPENSE', 'SETTLEMENT', 'GROUP', 'CONNECTION'].includes(value)
    ? (value as ActivityArea)
    : undefined;
}
