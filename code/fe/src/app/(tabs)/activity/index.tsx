import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, RefreshControl, View } from 'react-native';

import type { ActivityItem } from '@/api/contracts';
import { Card, ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { ActivityEventRow } from '@/features/activity/components/activity-event-row';
import { activityAreaFromParam, activityInfiniteQuery } from '@/features/activity/api';
import { activityDayLabel } from '@/features/activity/presentation';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

export default function ActivityScreen() {
  const primary = useThemeVariable(THEME_VARIABLES.primary);
  const params = useLocalSearchParams<{ area?: string; ledgerId?: string }>();
  const filters = {
    area: activityAreaFromParam(params.area),
    ledgerId: typeof params.ledgerId === 'string' ? params.ledgerId : undefined,
  };
  const activity = useInfiniteQuery(activityInfiniteQuery(filters));
  const profile = useQuery(profileQuery);
  const items = useMemo(() => activity.data?.pages.flatMap((page) => page.items) ?? [], [activity.data]);
  const sections = useMemo(() => groupByDay(items), [items]);
  const filterHref = {
    pathname: '/activity/search' as const,
    params: {
      ...(filters.area ? { area: filters.area } : {}),
      ...(filters.ledgerId ? { ledgerId: filters.ledgerId } : {}),
    },
  };
  const activeFilterText = [filters.area ? areaLabel(filters.area) : null, filters.ledgerId ? 'Selected ledger' : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href={filterHref} asChild>
              <Button variant="link" role="link" accessibilityLabel="Filter activity"><Text>Filter</Text></Button>
            </Link>
          ),
        }}
      />
      {activity.isLoading || profile.isLoading ? <Loading /> : (
        <Screen refreshControl={<RefreshControl refreshing={activity.isRefetching && !activity.isFetchingNextPage} onRefresh={() => activity.refetch()} tintColor={primary} colors={[primary]} />}>
          {activity.error || profile.error ? <ErrorMessage error={activity.error ?? profile.error} /> : null}
          {activeFilterText ? (
            <Link href={filterHref} asChild>
              <Button variant="outline" role="link" accessibilityLabel={`Change filters: ${activeFilterText}`}><Text>{activeFilterText}</Text></Button>
            </Link>
          ) : null}
          {items.length ? (
            sections.map((section) => (
              <View key={section.title} className="gap-2">
                <SectionLabel>{section.title.toUpperCase()}</SectionLabel>
                <Card>{section.items.map((item) => profile.data ? <ActivityEventRow key={item.id} item={item} displayCurrency={profile.data.displayCurrency} /> : null)}</Card>
              </View>
            ))
          ) : (
            <EmptyActivity filtered={Boolean(activeFilterText)} />
          )}
          {activity.hasNextPage ? <Button variant="outline" disabled={activity.isFetchingNextPage} accessibilityState={{ disabled: activity.isFetchingNextPage, busy: activity.isFetchingNextPage }} onPress={() => activity.fetchNextPage()}>{activity.isFetchingNextPage ? <ActivityIndicator className="text-primary" /> : <Text>Load more activity</Text>}</Button> : null}
        </Screen>
      )}
    </>
  );
}

function EmptyActivity({ filtered }: { filtered: boolean }) {
  return (
    <View className="items-center gap-2 py-10">
      <Text selectable className="text-center text-xl font-semibold leading-[26px]">
        {filtered ? 'No activity with these filters' : 'Nothing has happened yet'}
      </Text>
      <Text selectable className="text-center leading-6 text-muted-foreground">
        {filtered ? 'Try changing the area or ledger filter.' : 'Shared expenses, payments, groups, and connections will appear here.'}
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

function areaLabel(area: NonNullable<ReturnType<typeof activityAreaFromParam>>) {
  return { EXPENSE: 'Expenses', SETTLEMENT: 'Payments', GROUP: 'Groups', CONNECTION: 'Connections' }[area];
}
