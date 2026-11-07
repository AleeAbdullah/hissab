import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, Stack } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import { Icons } from '@/components/icons';
import {
  Card,
  ErrorMessage,
  Loading,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import {
  personalHistoryInfiniteQuery,
  personalReportQuery
} from '@/features/personal/api';
import { PersonalHistoryRow } from '@/features/personal/components/personal-history-row';
import { PersonalSummary } from '@/features/personal/components/personal-summary';
import { SpendingChart } from '@/features/personal/components/spending-chart';
import { periodLabel } from '@/features/personal/form';
import { spendingRange } from '@/features/personal/spending';
import { formatMinorAmount } from '@/lib/money';

export default function PersonalScreen() {
  const profile = useQuery(profileQuery);
  const range = spendingRange('1M');
  const report = useQuery(personalReportQuery({ ...range, bucket: 'DAY' }));
  const history = useInfiniteQuery(personalHistoryInfiniteQuery({}, 5));
  const recent = useMemo(
    () => history.data?.pages.flatMap((page) => page.items) ?? [],
    [history.data]
  );
  if (profile.isLoading || report.isLoading || history.isLoading)
    return <Loading />;
  if (
    profile.error ||
    report.error ||
    history.error ||
    !profile.data ||
    !report.data
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            profile.error ??
            report.error ??
            history.error ??
            new Error('Personal data is unavailable.')
          }
        />
      </Screen>
    );
  return (
    <>
      <Stack.Screen options={{ headerRight: () => <AddTransactionButton /> }} />
      <Screen>
        <Link href="/personal/spending" asChild>
          <Button
            variant="ghost"
            role="link"
            className="flex-col items-stretch gap-4 rounded-2xl border border-border bg-card p-4"
            accessibilityLabel={`Spent this month, ${formatMinorAmount(report.data.expenseMinor, profile.data.displayCurrency)}. View spending report.`}
          >
            <View className="flex-row items-start justify-between gap-3">
              <View className="min-w-0 flex-1 gap-1">
                <Text className="text-base font-normal text-muted-foreground">
                  Spent this month
                </Text>
                <Text className="text-[32px] font-semibold leading-[38px]">
                  {formatMinorAmount(
                    report.data.expenseMinor,
                    profile.data.displayCurrency
                  )}
                </Text>
              </View>
              <Icon
                as={Icons.chevronRight}
                size={20}
                className="mt-0.5 text-primary"
                accessibilityElementsHidden
                importantForAccessibility="no"
              />
            </View>
            <SpendingChart
              compact
              buckets={report.data.buckets}
              range={range}
              displayCurrency={profile.data.displayCurrency}
              emptyLabel="No spending yet this month"
            />
          </Button>
        </Link>
        <PersonalSummary
          displayCurrency={profile.data.displayCurrency}
          report={report.data}
          title={periodLabel(range.from.slice(0, 7), 'MONTH')}
        />
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-4">
            <SectionLabel>HISTORY</SectionLabel>
            <Link href="/personal/transactions" asChild>
              <Button variant="link" role="link" className="px-0">
                <Text>View all</Text>
              </Button>
            </Link>
          </View>
          {recent.length ? (
            <Card>
              {recent.map((item) => (
                <PersonalHistoryRow
                  key={`${item.kind}-${item.id}`}
                  displayCurrency={profile.data.displayCurrency}
                  item={item}
                />
              ))}
            </Card>
          ) : (
            <Text selectable>No history yet.</Text>
          )}
        </View>
      </Screen>
    </>
  );
}

function AddTransactionButton() {
  return (
    <Link href="/personal-transaction" asChild>
      <Button
        className="w-12 px-0"
        variant="ghost"
        role="link"
        accessibilityLabel="Add personal transaction"
      >
        <Text className="text-[30px] font-light text-primary">＋</Text>
      </Button>
    </Link>
  );
}
