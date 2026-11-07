import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ListFilter, X } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  RefreshControl,
  View,
  type GestureResponderEvent
} from 'react-native';

import type { ActivityItem } from '@/api/contracts';
import { ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import {
  activityAreaFromParam,
  activityInfiniteQuery
} from '@/features/activity/api';
import { ActivityEventRow } from '@/features/activity/components/activity-event-row';
import {
  ActivityFilterSheet,
  activityAreas,
  type ActivityLedgerChoice,
  type ActivityFilters
} from '@/features/activity/components/activity-filter-sheet';
import { activityDayLabel } from '@/features/activity/presentation';
import { connectionsQuery } from '@/features/connections/api';
import { groupsQuery } from '@/features/groups/api';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

export default function ActivityScreen() {
  const primary = useThemeVariable(THEME_VARIABLES.primary);
  const params = useLocalSearchParams<{
    area?: string;
    ledgerId?: string;
    filters?: string;
    ledgerName?: string;
  }>();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButton = useRef<GestureResponderEvent['currentTarget'] | null>(
    null
  );
  const wasOpen = useRef(false);
  const groups = useQuery(groupsQuery);
  const connections = useQuery(connectionsQuery);
  const filters = {
    area: activityAreaFromParam(params.area),
    ledgerId: typeof params.ledgerId === 'string' ? params.ledgerId : undefined
  };
  const activity = useInfiniteQuery(activityInfiniteQuery(filters));
  const profile = useQuery(profileQuery);
  const items = useMemo(
    () => activity.data?.pages.flatMap((page) => page.items) ?? [],
    [activity.data]
  );
  const sections = useMemo(() => groupByDay(items), [items]);
  const ledgers: ActivityLedgerChoice[] = [
    ...(groups.data ?? []).map((group) => ({
      id: group.id,
      name: group.name,
      type: 'GROUP' as const,
      subtitle: group.status === 'ARCHIVED' ? 'Group · Archived' : 'Group'
    })),
    ...(connections.data ?? []).map((connection) => ({
      id: connection.ledgerId,
      name: connection.displayName,
      type: 'DIRECT' as const,
      subtitle: 'Direct ledger'
    }))
  ].sort((left, right) => left.name.localeCompare(right.name));
  if (
    filters.ledgerId &&
    !ledgers.some((ledger) => ledger.id === filters.ledgerId)
  ) {
    ledgers.unshift({
      id: filters.ledgerId,
      name:
        items.find((item) => item.ledger?.id === filters.ledgerId)?.ledger
          ?.name ??
        params.ledgerName ??
        'Archived ledger',
      subtitle: 'Selected ledger · history'
    });
  }
  const selectedLedgerName = ledgers.find(
    (ledger) => ledger.id === filters.ledgerId
  )?.name;
  const hasFilters = Boolean(filters.area || filters.ledgerId);
  const open = filtersOpen || params.filters === 'open';
  useEffect(() => {
    if (wasOpen.current && !open) {
      const frame = requestAnimationFrame(() => {
        if (filterButton.current) {
          filterButton.current.focus();
          AccessibilityInfo.sendAccessibilityEvent(
            filterButton.current,
            'focus'
          );
        }
      });
      wasOpen.current = open;
      return () => cancelAnimationFrame(frame);
    }
    wasOpen.current = open;
  }, [open]);
  const close = () => {
    setFiltersOpen(false);
    router.setParams({ filters: undefined });
  };
  const apply = (next: ActivityFilters) => {
    router.setParams({
      area: next.area,
      ledgerId: next.ledgerId,
      ledgerName: next.ledgerId
        ? ledgers.find((ledger) => ledger.id === next.ledgerId)?.name
        : undefined,
      filters: undefined
    });
    setFiltersOpen(false);
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Button
              className="w-12 px-0"
              variant="ghost"
              accessibilityLabel="Filter activity"
              accessibilityState={{ expanded: open }}
              onPress={(event) => {
                filterButton.current = event.currentTarget;
                setFiltersOpen(true);
              }}
            >
              <Icon as={ListFilter} size={22} className="text-primary" />
            </Button>
          )
        }}
      />
      <View
        className="flex-1"
        accessibilityElementsHidden={open}
        importantForAccessibility={open ? 'no-hide-descendants' : 'auto'}
      >
        {activity.isLoading || profile.isLoading ? (
          <Loading />
        ) : (
          <Screen
            refreshControl={
              <RefreshControl
                refreshing={
                  activity.isRefetching && !activity.isFetchingNextPage
                }
                onRefresh={() => activity.refetch()}
                tintColor={primary}
                colors={[primary]}
              />
            }
          >
            {activity.error || profile.error ? (
              <ErrorMessage error={activity.error ?? profile.error} />
            ) : null}
            {hasFilters ? (
              <View className="flex-row flex-wrap gap-2">
                {filters.area ? (
                  <Button
                    variant="outline"
                    accessibilityLabel={`Remove ${areaLabel(filters.area)} filter`}
                    onPress={() => apply({ ...filters, area: undefined })}
                  >
                    <Text>{areaLabel(filters.area)}</Text>
                    <Icon as={X} size={16} />
                  </Button>
                ) : null}
                {filters.ledgerId ? (
                  <Button
                    variant="outline"
                    accessibilityLabel={`Remove ${selectedLedgerName} filter`}
                    onPress={() => apply({ ...filters, ledgerId: undefined })}
                  >
                    <Text>{selectedLedgerName}</Text>
                    <Icon as={X} size={16} />
                  </Button>
                ) : null}
              </View>
            ) : null}
            {items.length ? (
              sections.map((section) => (
                <View key={section.title} className="gap-2">
                  <SectionLabel>{section.title.toUpperCase()}</SectionLabel>
                  <View>
                    {section.items.map((item) =>
                      profile.data ? (
                        <ActivityEventRow
                          key={item.id}
                          item={item}
                          currentUserId={profile.data.id}
                          displayCurrency={profile.data.displayCurrency}
                        />
                      ) : null
                    )}
                  </View>
                </View>
              ))
            ) : activity.isSuccess ? (
              <EmptyActivity filtered={hasFilters} />
            ) : null}
            {activity.hasNextPage ? (
              <Button
                variant="outline"
                disabled={activity.isFetchingNextPage}
                accessibilityState={{
                  disabled: activity.isFetchingNextPage,
                  busy: activity.isFetchingNextPage
                }}
                onPress={() => activity.fetchNextPage()}
              >
                {activity.isFetchingNextPage ? (
                  <ActivityIndicator className="text-primary" />
                ) : (
                  <Text>Load more activity</Text>
                )}
              </Button>
            ) : null}
          </Screen>
        )}
      </View>
      {open ? (
        <ActivityFilterSheet
          filters={filters}
          ledgers={ledgers}
          error={groups.error ?? connections.error}
          loading={groups.isLoading || connections.isLoading}
          onRetry={() => {
            void groups.refetch();
            void connections.refetch();
          }}
          onClose={close}
          onApply={apply}
        />
      ) : null}
    </>
  );
}

function EmptyActivity({ filtered }: { filtered: boolean }) {
  return (
    <View className="items-center gap-2 py-10">
      <Text
        selectable
        className="text-center text-xl font-semibold leading-[26px]"
      >
        {filtered
          ? 'No activity with these filters'
          : 'Nothing has happened yet'}
      </Text>
      <Text selectable className="text-center leading-6 text-muted-foreground">
        {filtered
          ? 'Try changing the area or ledger filter.'
          : 'Shared expenses, payments, groups, and connections will appear here.'}
      </Text>
    </View>
  );
}

function groupByDay(items: ActivityItem[]) {
  const sections: { title: string; items: ActivityItem[] }[] = [];
  for (const item of items) {
    const title = activityDayLabel(item.createdAt);
    const last = sections.at(-1);
    if (last?.title === title) last.items.push(item);
    else sections.push({ title, items: [item] });
  }
  return sections;
}

function areaLabel(
  area: NonNullable<ReturnType<typeof activityAreaFromParam>>
) {
  return (
    activityAreas.find((item) => item.value === area)?.label ?? 'All activity'
  );
}
