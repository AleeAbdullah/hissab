import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';

import type { ActivityItem } from '@/api/contracts';
import { Button, Card, ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { ActivityEventRow } from '@/features/activity/components/activity-event-row';
import { activityAreaFromParam, activityInfiniteQuery } from '@/features/activity/api';
import { activityDayLabel } from '@/features/activity/presentation';
import { useAppTheme } from '@/theme/theme';

export default function ActivityScreen() {
  const { colors } = useAppTheme();
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
              <Pressable accessibilityRole="button" accessibilityLabel="Filter activity" style={{ minWidth: 44, minHeight: 44, justifyContent: 'center' }}>
                <Text style={{ color: colors.brand, fontSize: 16, fontWeight: '600' }}>Filter</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      {activity.isLoading || profile.isLoading ? <Loading /> : (
        <Screen refreshControl={<RefreshControl refreshing={activity.isRefetching && !activity.isFetchingNextPage} onRefresh={() => activity.refetch()} tintColor={colors.brand} colors={[colors.brand]} />}>
          {activity.error || profile.error ? <ErrorMessage error={activity.error ?? profile.error} /> : null}
          {activeFilterText ? (
            <Link href={filterHref} asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={`Change filters: ${activeFilterText}`} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.brandSubtle }}>
                <Text selectable style={{ color: colors.brand, fontSize: 15, lineHeight: 20, fontWeight: '600' }}>{activeFilterText}</Text>
              </Pressable>
            </Link>
          ) : null}
          {items.length ? (
            sections.map((section) => (
              <View key={section.title} style={{ gap: 8 }}>
                <SectionLabel>{section.title.toUpperCase()}</SectionLabel>
                <Card>{section.items.map((item) => profile.data ? <ActivityEventRow key={item.id} item={item} displayCurrency={profile.data.displayCurrency} /> : null)}</Card>
              </View>
            ))
          ) : (
            <EmptyActivity filtered={Boolean(activeFilterText)} />
          )}
          {activity.hasNextPage ? <Button title="Load more activity" secondary loading={activity.isFetchingNextPage} onPress={() => activity.fetchNextPage()} /> : null}
        </Screen>
      )}
    </>
  );
}

function EmptyActivity({ filtered }: { filtered: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ alignItems: 'center', gap: 8, paddingVertical: 40 }}>
      <Text selectable style={{ color: colors.text, fontSize: 20, lineHeight: 26, fontWeight: '600', textAlign: 'center' }}>
        {filtered ? 'No activity with these filters' : 'Nothing has happened yet'}
      </Text>
      <Text selectable style={{ color: colors.secondary, fontSize: 16, lineHeight: 24, textAlign: 'center' }}>
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
