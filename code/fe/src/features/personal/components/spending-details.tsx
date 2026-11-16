import { keepPreviousData, useQueries, useQuery } from '@tanstack/react-query';
import {
  ChartColumn,
  ChartLine,
  ChartPie,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp
} from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import {
  AmountText,
  Card,
  ErrorMessage,
  IconTile,
  ListRow,
  Row,
  SectionLabel,
  SegmentedControl
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  personalCategoriesQuery,
  personalReportQuery
} from '@/features/personal/api';
import { CATEGORY_ICONS } from '@/features/personal/components/category-picker';
import { IncludeSharedSwitch } from '@/features/personal/components/include-shared-switch';
import {
  SpendingChart,
  SpendingPlotFrame
} from '@/features/personal/components/spending-chart';
import { SpendingDonut } from '@/features/personal/components/spending-donut';
import { periodLabel } from '@/features/personal/form';
import {
  SPENDING_PERIOD_NAMES,
  SPENDING_PERIODS,
  spendingBucket,
  spendingRange,
  spendingRangeLabel,
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
  const [monthOffset, setMonthOffset] = useState(0);
  const range = spendingRange(period, undefined, monthOffset);
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
  const [shown, setShown] = useState({ period, monthOffset });
  if (
    !report.isPlaceholderData &&
    (shown.period !== period || shown.monthOffset !== monthOffset)
  )
    setShown({ period, monthOffset });
  const shownPeriod = shown.period;
  const shownRange = spendingRange(shownPeriod, undefined, shown.monthOffset);
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
          <AmountText className="text-[32px] font-semibold leading-[38px]">
            {formatMinorAmount(report.data.expenseMinor, displayCurrency)}
          </AmountText>
        ) : (
          <Text
            accessibilityLabel="Spending amount is loading"
            className="text-[32px] font-semibold leading-[38px] text-muted-foreground"
          >
            —
          </Text>
        )}
        {period === '1M' ? (
          <View className="-ml-3 flex-row items-center">
            <Button
              variant="ghost"
              className="w-11 px-0"
              accessibilityLabel="Previous month"
              onPress={() => setMonthOffset(monthOffset - 1)}
            >
              <Icon as={ChevronLeft} size={20} className="text-primary" />
            </Button>
            <Text className="text-[15px] leading-[22px] text-muted-foreground">
              {shown.monthOffset
                ? spendingRangeLabel(shownRange)
                : `${SPENDING_PERIOD_NAMES[shownPeriod]} · ${spendingRangeLabel(shownRange)}`}
            </Text>
            <Button
              variant="ghost"
              className="w-11 px-0"
              accessibilityLabel="Next month"
              disabled={monthOffset === 0}
              onPress={() => setMonthOffset(monthOffset + 1)}
            >
              <Icon
                as={ChevronRight}
                size={20}
                className={
                  monthOffset === 0 ? 'text-muted-foreground' : 'text-primary'
                }
              />
            </Button>
          </View>
        ) : (
          <Text className="text-[15px] leading-[22px] text-muted-foreground">
            {SPENDING_PERIOD_NAMES[shownPeriod]} ·{' '}
            {spendingRangeLabel(shownRange)}
          </Text>
        )}
      </View>
      <IncludeSharedSwitch
        value={includeShared}
        onValueChange={setIncludeShared}
      />
      <Card className="gap-3 p-4">
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
          <SegmentedControl
            compact
            value={graph}
            onChange={setGraph}
            options={[
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
              { value: 'donut', icon: ChartPie, label: 'Category donut graph' }
            ]}
          />
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
      </Card>
      <SegmentedControl
        options={SPENDING_PERIODS.map((value) => ({
          value,
          label: value,
          accessibilityLabel: SPENDING_PERIOD_NAMES[value]
        }))}
        value={period}
        onChange={(value) => {
          setPeriod(value);
          setMonthOffset(0);
        }}
      />
      {report.data && !report.error && hasSpending ? (
        <View className="mt-4 gap-3">
          <SectionLabel>CATEGORIES</SectionLabel>
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
            <View>
              {categoryRows.map((category, rank) => {
                const share = spendingShareLabel(
                  category.amountMinor,
                  report.data.expenseMinor
                );
                const amount = formatMinorAmount(
                  category.amountMinor,
                  displayCurrency
                );
                return (
                  <ListRow
                    key={category.code}
                    divided={rank > 0}
                    accessibilityLabel={`${category.name}, ${amount}, ${share} of spending. Show transactions.`}
                    href={{
                      pathname: '/personal/transactions',
                      params: {
                        categoryCode: category.code,
                        from: shownRange.from.slice(0, 10),
                        to: lastDay(shownRange.to),
                        includeShared: includeShared ? 'true' : 'false'
                      }
                    }}
                    leading={<IconTile icon={CATEGORY_ICONS[category.code]} />}
                    title={category.name}
                    subtitle={`${share} of spending`}
                    trailing={
                      <Text
                        selectable
                        className="text-base font-semibold tabular-nums leading-[22px]"
                      >
                        {amount}
                      </Text>
                    }
                  />
                );
              })}
            </View>
          )}
          <Button
            variant="link"
            size="compact"
            className="justify-start self-start px-0"
            accessibilityState={{ expanded: showAmounts }}
            onPress={() => setShowAmounts(!showAmounts)}
          >
            <Text>
              {showAmounts ? 'Hide' : 'Show'} amounts by{' '}
              {shownBucket === 'MONTH' ? 'month' : 'day'}
            </Text>
            <Icon
              as={showAmounts ? ChevronUp : ChevronDown}
              size={20}
              className="text-primary"
            />
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

// Report ranges end at an exclusive instant; history filters take the last included day.
function lastDay(exclusiveTo: string) {
  return new Date(new Date(exclusiveTo).getTime() - 86400000)
    .toISOString()
    .slice(0, 10);
}
