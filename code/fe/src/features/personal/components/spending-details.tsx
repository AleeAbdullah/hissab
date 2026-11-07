import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import { ChartColumn, ChartLine, ChartPie } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { Card, ErrorMessage, Row, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  personalCategoriesQuery,
  personalReportQuery
} from '@/features/personal/api';
import { IncludeSharedSwitch } from '@/features/personal/components/include-shared-switch';
import {
  SpendingChart,
  SpendingPlotFrame
} from '@/features/personal/components/spending-chart';
import {
  CategorySwatch,
  SpendingDonut
} from '@/features/personal/components/spending-donut';
import { periodLabel } from '@/features/personal/form';
import {
  SPENDING_PERIOD_NAMES,
  SPENDING_PERIODS,
  spendingBucket,
  spendingRange,
  spendingRangeLabel,
  spendingRatio,
  spendingSeriesName,
  spendingShareLabel,
  type SpendingPeriod
} from '@/features/personal/spending';
import { formatMinorAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

export function SpendingDetails({
  displayCurrency
}: {
  displayCurrency: DisplayCurrency;
}) {
  const [period, setPeriod] = useState<SpendingPeriod>('1M');
  const [graph, setGraph] = useState<'line' | 'bar' | 'donut'>('line');
  const [showAmounts, setShowAmounts] = useState(false);
  const [includeShared, setIncludeShared] = useState(true);
  const range = spendingRange(period);
  const filters = {
    ...range,
    includeShared: includeShared ? ('true' as const) : ('false' as const),
    type: 'EXPENSE' as const,
    bucket: spendingBucket(period)
  };
  const report = useQuery({
    ...personalReportQuery(filters),
    placeholderData: keepPreviousData
  });
  // While the next period loads, keep drawing the previous one so the dimmed
  // placeholder data is never read against the wrong range or bucket.
  const [shownPeriod, setShownPeriod] = useState(period);
  if (!report.isPlaceholderData && shownPeriod !== period)
    setShownPeriod(period);
  const shownRange = spendingRange(shownPeriod);
  const shownBucket = spendingBucket(shownPeriod);
  const refreshing = report.isPlaceholderData;
  const hasSpending = Boolean(
    report.data && BigInt(report.data.expenseMinor) > 0n
  );
  const categories = useQuery(personalCategoriesQuery);
  const expenseCategories = (categories.data ?? []).filter(
    (category) => category.kind === 'EXPENSE'
  );
  const categoryReports = useQueries({
    // Nine fixed categories. Use a grouped endpoint if the category list grows.
    queries: expenseCategories.map((category) => ({
      ...personalReportQuery({ ...filters, categoryCode: category.code }),
      enabled: hasSpending && !refreshing
    }))
  });
  const categoryError =
    categories.error ?? categoryReports.find((result) => result.error)?.error;
  const categoryRows = expenseCategories
    .map((category, index) => ({
      ...category,
      amountMinor: categoryReports[index].data?.expenseMinor ?? '0'
    }))
    .filter((category) => BigInt(category.amountMinor) > 0n)
    .sort((a, b) =>
      BigInt(a.amountMinor) > BigInt(b.amountMinor)
        ? -1
        : BigInt(a.amountMinor) < BigInt(b.amountMinor)
          ? 1
          : 0
    );
  const categoriesLoading =
    categories.isLoading || categoryReports.some((result) => result.isPending);

  return (
    <>
      <View className={cn('gap-1', refreshing && 'opacity-50')}>
        <Text className="text-base text-muted-foreground">Spent</Text>
        {report.data ? (
          <Text selectable className="text-[32px] font-semibold leading-[38px]">
            {formatMinorAmount(report.data.expenseMinor, displayCurrency)}
          </Text>
        ) : (
          <Text
            accessibilityLabel="Spending amount is loading"
            className="text-[32px] font-semibold leading-[38px] text-muted-foreground"
          >
            —
          </Text>
        )}
        <Text className="text-[15px] leading-[22px] text-muted-foreground">
          {SPENDING_PERIOD_NAMES[shownPeriod]} ·{' '}
          {spendingRangeLabel(shownRange)}
        </Text>
      </View>
      <View className="gap-3 rounded-2xl border border-border bg-card p-4">
        <View className="flex-row items-center justify-between gap-3">
          <View className="min-w-0 flex-1 flex-row items-center gap-2">
            <Text className="shrink text-[15px] leading-[22px] text-muted-foreground">
              {graph === 'donut'
                ? 'By category'
                : spendingSeriesName(graph, shownBucket)}
            </Text>
            {refreshing ? (
              <ActivityIndicator
                accessibilityLabel="Refreshing spending"
                className="text-primary"
              />
            ) : null}
          </View>
          <View className="flex-row rounded-full bg-secondary p-0.5">
            {(
              [
                {
                  value: 'line',
                  icon: ChartLine,
                  label: 'Cumulative line graph'
                },
                {
                  value: 'bar',
                  icon: ChartColumn,
                  label: `${spendingSeriesName('bar', shownBucket)} bar graph`
                },
                {
                  value: 'donut',
                  icon: ChartPie,
                  label: 'Category donut graph'
                }
              ] as const
            ).map((option) => (
              <Button
                key={option.value}
                variant="ghost"
                size="compact"
                className={
                  graph === option.value
                    ? 'rounded-full bg-card'
                    : 'rounded-full'
                }
                accessibilityLabel={option.label}
                accessibilityState={{ selected: graph === option.value }}
                onPress={() => setGraph(option.value)}
              >
                <Icon
                  as={option.icon}
                  size={18}
                  className={
                    graph === option.value
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }
                />
              </Button>
            ))}
          </View>
        </View>
        <View className={cn(refreshing && 'opacity-50')}>
          {report.isLoading ? (
            <SpendingPlotFrame>
              <ActivityIndicator
                accessibilityLabel="Loading spending"
                className="text-primary"
              />
            </SpendingPlotFrame>
          ) : report.error || !report.data ? (
            <SpendingPlotFrame>
              <View className="w-full gap-2">
                <ErrorMessage
                  error={report.error ?? new Error('Spending is unavailable.')}
                />
                <Button variant="outline" onPress={() => report.refetch()}>
                  <Text>Try again</Text>
                </Button>
              </View>
            </SpendingPlotFrame>
          ) : graph === 'donut' ? (
            !hasSpending ? (
              <SpendingDonut categories={[]} />
            ) : categoryError ? (
              <SpendingPlotFrame>
                <ErrorMessage error={categoryError} />
              </SpendingPlotFrame>
            ) : categoriesLoading ? (
              <SpendingPlotFrame>
                <ActivityIndicator
                  accessibilityLabel="Loading category graph"
                  className="text-primary"
                />
              </SpendingPlotFrame>
            ) : (
              <SpendingDonut categories={categoryRows} />
            )
          ) : (
            <SpendingChart
              variant={graph}
              buckets={report.data.buckets}
              range={shownRange}
              bucket={shownBucket}
              displayCurrency={displayCurrency}
              emptyLabel="No spending recorded for this period."
            />
          )}
        </View>
      </View>
      <View className="flex-row flex-wrap rounded-2xl bg-secondary p-1">
        {SPENDING_PERIODS.map((value) => (
          <Button
            key={value}
            variant="ghost"
            className={
              value === period
                ? 'min-w-16 flex-1 rounded-xl bg-card'
                : 'min-w-16 flex-1 rounded-xl'
            }
            accessibilityLabel={SPENDING_PERIOD_NAMES[value]}
            accessibilityState={{ selected: value === period }}
            onPress={() => setPeriod(value)}
          >
            <Text
              className={
                value === period ? 'text-primary' : 'text-muted-foreground'
              }
            >
              {value}
            </Text>
          </Button>
        ))}
      </View>
      <IncludeSharedSwitch
        value={includeShared}
        onValueChange={setIncludeShared}
      />
      {report.data && !report.error && hasSpending ? (
        <View className="mt-4 gap-3">
          <SectionLabel>BY CATEGORY</SectionLabel>
          {categoryError ? (
            <View className="gap-2">
              <ErrorMessage error={categoryError} />
              <Button
                variant="outline"
                onPress={() => {
                  void categories.refetch();
                  categoryReports.forEach((result) => {
                    void result.refetch();
                  });
                }}
              >
                <Text>Retry categories</Text>
              </Button>
            </View>
          ) : categoriesLoading ? (
            <Text>Loading categories…</Text>
          ) : (
            <Card>
              {categoryRows.map((category, rank) => (
                <CategoryRow
                  key={category.code}
                  rank={rank}
                  name={category.name}
                  share={spendingShareLabel(
                    category.amountMinor,
                    report.data.expenseMinor
                  )}
                  ratio={spendingRatio(
                    category.amountMinor,
                    report.data.expenseMinor
                  )}
                  amount={formatMinorAmount(
                    category.amountMinor,
                    displayCurrency
                  )}
                />
              ))}
            </Card>
          )}
          <Button
            variant="ghost"
            className="self-start px-0"
            accessibilityState={{ expanded: showAmounts }}
            onPress={() => setShowAmounts(!showAmounts)}
          >
            <Text className="text-primary">
              {showAmounts ? 'Hide' : 'Show'}{' '}
              {shownBucket === 'MONTH' ? 'monthly' : 'daily'} amounts
            </Text>
          </Button>
          {showAmounts ? (
            <Card>
              {report.data.buckets
                .filter((bucket) => BigInt(bucket.expenseMinor) > 0n)
                .map((bucket) => (
                  <Row
                    key={bucket.period}
                    title={periodLabel(bucket.period, shownBucket)}
                    detail={formatMinorAmount(
                      bucket.expenseMinor,
                      displayCurrency
                    )}
                  />
                ))}
            </Card>
          ) : null}
        </View>
      ) : null}
    </>
  );
}

// Mirrors Row's layout, adding the swatch and proportional bar a plain Row cannot hold.
function CategoryRow({
  rank,
  name,
  share,
  ratio,
  amount
}: {
  rank: number;
  name: string;
  share: string;
  ratio: number;
  amount: string;
}) {
  return (
    <View className="min-h-[52px] flex-row items-center gap-3 border-b border-border p-3">
      <CategorySwatch rank={rank} />
      <View className="min-w-0 flex-1 gap-1">
        <Text selectable className="text-[17px] leading-[23px]">
          {name}
        </Text>
        <Text
          selectable
          className="text-[13px] leading-[18px] text-muted-foreground"
        >
          {share} of spending
        </Text>
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          className="h-1 overflow-hidden rounded-full bg-secondary"
        >
          <View
            className="h-1 rounded-full bg-primary"
            style={{ width: `${Math.max(ratio * 100, 2)}%` }}
          />
        </View>
      </View>
      <Text
        selectable
        className="max-w-[42%] text-right text-[15px] leading-5 text-muted-foreground"
      >
        {amount}
      </Text>
    </View>
  );
}
