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
import { useTranslation } from 'react-i18next';
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
import { isolate } from '@/i18n';
import { categoryName } from '@/i18n/categories';
import { formatMinorAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

export function SpendingDetails({
  displayCurrency
}: {
  displayCurrency: DisplayCurrency;
}) {
  const { t } = useTranslation(['personal', 'common']);
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
        <Text className="text-base text-muted-foreground">{t('spent')}</Text>
        {report.data ? (
          <AmountText className="text-[32px] font-semibold leading-[38px]">
            {formatMinorAmount(report.data.expenseMinor, displayCurrency)}
          </AmountText>
        ) : (
          <Text
            accessibilityLabel={t('spendingAmountIsLoading')}
            className="text-[32px] font-semibold leading-[38px] text-muted-foreground"
          >
            {t('loadingPlaceholder')}
          </Text>
        )}
        {period === '1M' ? (
          <View className="-ms-3 flex-row items-center">
            <Button
              variant="ghost"
              className="w-11 px-0"
              accessibilityLabel={t('previousMonth')}
              onPress={() => setMonthOffset(monthOffset - 1)}
            >
              <Icon as={ChevronLeft} size={20} className="text-primary" />
            </Button>
            <Text className="text-[15px] leading-[22px] text-muted-foreground">
              {shown.monthOffset
                ? spendingRangeLabel(shownRange)
                : t('periodRange', {
                    period: SPENDING_PERIOD_NAMES[shownPeriod],
                    range: isolate(spendingRangeLabel(shownRange))
                  })}
            </Text>
            <Button
              variant="ghost"
              className="w-11 px-0"
              accessibilityLabel={t('nextMonth')}
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
            {t('periodRange', {
              period: SPENDING_PERIOD_NAMES[shownPeriod],
              range: isolate(spendingRangeLabel(shownRange))
            })}
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
                ? t('byCategory')
                : spendingSeriesName(graph, shownBucket)}
            </Text>
            {refreshing ? (
              <ActivityIndicator
                accessibilityLabel={t('refreshingSpending')}
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
                label: t('cumulativeLineGraph')
              },
              {
                value: 'bar',
                icon: ChartColumn,
                label: t('barGraph', {
                  series: spendingSeriesName('bar', shownBucket)
                })
              },
              { value: 'donut', icon: ChartPie, label: t('categoryDonutGraph') }
            ]}
          />
        </View>
        <View className={cn(refreshing && 'opacity-50')}>
          {report.isLoading ? (
            <SpendingPlotFrame>
              <ActivityIndicator
                accessibilityLabel={t('loadingSpending')}
                className="text-primary"
              />
            </SpendingPlotFrame>
          ) : report.error || !report.data ? (
            <SpendingPlotFrame>
              <View className="w-full gap-2">
                <ErrorMessage
                  error={report.error ?? new Error(t('spendingIsUnavailable'))}
                />
                <Button variant="outline" onPress={() => report.refetch()}>
                  <Text>{t('tryAgain')}</Text>
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
                  accessibilityLabel={t('loadingCategoryGraph')}
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
              emptyLabel={t('noSpendingRecordedForThisPeriod')}
            />
          )}
        </View>
      </Card>
      <SegmentedControl
        options={SPENDING_PERIODS.map((value) => ({
          value,
          label: t(
            (
              {
                '1W': 'periodWeek',
                '1M': 'periodMonth',
                '6M': 'periodSixMonths',
                '1Y': 'periodYear'
              } as const
            )[value]
          ),
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
          <SectionLabel>{t('categories')}</SectionLabel>
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
                <Text>{t('retryCategories')}</Text>
              </Button>
            </View>
          ) : categoriesLoading ? (
            <Text>{t('loadingCategoriesProgress')}</Text>
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
                    accessibilityLabel={t('categorySpending', {
                      category: categoryName(category.code),
                      amount: isolate(amount),
                      share: isolate(share)
                    })}
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
                    title={categoryName(category.code)}
                    subtitle={t('shareOfSpending', { share: isolate(share) })}
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
              {t(
                shownBucket === 'MONTH'
                  ? showAmounts
                    ? 'hideMonthly'
                    : 'showMonthly'
                  : showAmounts
                    ? 'hideDaily'
                    : 'showDaily'
              )}
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
