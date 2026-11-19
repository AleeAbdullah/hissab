import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ListFilter, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Keyboard, View } from 'react-native';

import type {
  PersonalCategoryCode,
  PersonalHistoryItem,
  PersonalTransactionType
} from '@/api/contracts';
import {
  Chip,
  DayHeading,
  ErrorMessage,
  Loading,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { groupByDay } from '@/features/activity/presentation';
import {
  personalCategoriesQuery,
  personalHistoryInfiniteQuery
} from '@/features/personal/api';
import { IncludeSharedSwitch } from '@/features/personal/components/include-shared-switch';
import { PersonalHistoryRow } from '@/features/personal/components/personal-history-row';
import { PersonalHistorySummary } from '@/features/personal/components/personal-summary';
import {
  TransactionFilterSheet,
  type TransactionFilters
} from '@/features/personal/components/transaction-filter-sheet';
import { historyPeriodLabel, periodLabel } from '@/features/personal/form';
import { isolate } from '@/i18n';
import { categoryName } from '@/i18n/categories';
import { dateToIso, dateToExclusiveIso } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

export default function TransactionsScreen() {
  const { t } = useTranslation(['personal', 'common']);
  // Spending's category rows open this list already filtered.
  const params = useLocalSearchParams<{
    categoryCode?: PersonalCategoryCode;
    from?: string;
    to?: string;
    includeShared?: 'true' | 'false';
  }>();
  const [includeShared, setIncludeShared] = useState(
    params.includeShared !== 'false'
  );
  const [type, setType] = useState<PersonalTransactionType | undefined>(
    params.categoryCode ? 'EXPENSE' : undefined
  );
  const [categoryCode, setCategoryCode] = useState<
    PersonalCategoryCode | undefined
  >(params.categoryCode);
  const [fromDate, setFromDate] = useState<string | undefined>(
    params.from && dateToIso(params.from) ? params.from : undefined
  );
  const [toDate, setToDate] = useState<string | undefined>(
    params.to && dateToIso(params.to) ? params.to : undefined
  );
  const [minAmountMinor, setMinAmountMinor] = useState<string | undefined>();
  const [maxAmountMinor, setMaxAmountMinor] = useState<string | undefined>();
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterSheetVersion, setFilterSheetVersion] = useState(0);
  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchText.trim()), 300);
    return () => clearTimeout(timeout);
  }, [searchText]);
  const profile = useQuery(profileQuery);
  const categories = useQuery(personalCategoriesQuery);
  const history = useInfiniteQuery(
    personalHistoryInfiniteQuery({
      type,
      categoryCode,
      from: fromDate ? (dateToIso(fromDate) ?? undefined) : undefined,
      to: toDate ? (dateToExclusiveIso(toDate) ?? undefined) : undefined,
      minAmountMinor,
      maxAmountMinor,
      search: search || undefined,
      includeShared: includeShared ? 'true' : 'false',
      bucket: 'MONTH'
    })
  );
  const items = useMemo(
    () => history.data?.pages.flatMap((page) => page.items) ?? [],
    [history.data]
  );
  const groups = useMemo(() => groupByMonth(items), [items]);
  const availableCategories = (categories.data ?? []).filter(
    (category) => !type || category.kind === type
  );
  const selectedCategory = availableCategories.find(
    (category) => category.code === categoryCode
  );
  const amountLimitMinor = history.data?.pages[0]?.maxAmountMinor;
  const report = history.data?.pages[0]?.report;
  const sheetFilterCount =
    Number(Boolean(categoryCode)) +
    Number(Boolean(fromDate || toDate)) +
    Number(Boolean(minAmountMinor || maxAmountMinor));
  const activeFilterCount = Number(Boolean(type)) + sheetFilterCount;
  const changeType = (value: string) => {
    const next =
      value === 'ALL' ? undefined : (value as PersonalTransactionType);
    setType(next);
    if (
      categoryCode &&
      !(categories.data ?? []).some(
        (category) =>
          (!next || category.kind === next) && category.code === categoryCode
      )
    )
      setCategoryCode(undefined);
  };
  if (profile.isLoading) return <Loading />;
  if (profile.error || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={profile.error ?? new Error(t('profileIsUnavailable'))}
        />
      </Screen>
    );

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: t('searchHistory'),
            placement: 'stacked',
            hideWhenScrolling: false,
            autoCapitalize: 'none',
            onChangeText: (event) =>
              setSearchText(event.nativeEvent.text.slice(0, 100))
          },
          headerRight: () => (
            <Button
              className="w-12 px-0"
              variant="ghost"
              accessibilityLabel={
                sheetFilterCount
                  ? t('filterCount', { count: sheetFilterCount })
                  : t('filterHistory')
              }
              disabled={categories.isLoading || Boolean(categories.error)}
              onPress={() => {
                Keyboard.dismiss();
                setFilterSheetVersion((version) => version + 1);
                setFiltersOpen(true);
              }}
            >
              <Icon as={ListFilter} size={22} className="text-primary" />
            </Button>
          )
        }}
      />
      <Screen>
        <IncludeSharedSwitch
          value={includeShared}
          onValueChange={setIncludeShared}
        />
        <View className="flex-row flex-wrap items-center gap-2">
          {[
            { label: t('all'), value: 'ALL' },
            { label: t('expenses'), value: 'EXPENSE' },
            { label: t('income'), value: 'INCOME' }
          ].map((choice) => {
            const selected = (type ?? 'ALL') === choice.value;
            return (
              <Chip
                key={choice.value}
                label={choice.label}
                selected={selected}
                onPress={() => changeType(choice.value)}
              />
            );
          })}
          {categoryCode ? (
            <Chip
              selected
              label={
                (selectedCategory
                  ? categoryName(selectedCategory.code)
                  : undefined) ?? t('category')
              }
              trailingIcon={X}
              accessibilityLabel={t('removeCategory', {
                category: selectedCategory
                  ? categoryName(selectedCategory.code)
                  : t('category')
              })}
              onPress={() => setCategoryCode(undefined)}
            />
          ) : null}
          {fromDate || toDate ? (
            <Chip
              selected
              label={historyPeriodLabel(fromDate, toDate)}
              trailingIcon={X}
              accessibilityLabel={t('removeDateFilter')}
              onPress={() => {
                setFromDate(undefined);
                setToDate(undefined);
              }}
            />
          ) : null}
          {minAmountMinor || maxAmountMinor ? (
            <Chip
              selected
              label={t('range', {
                from: isolate(
                  formatMinorAmount(
                    minAmountMinor ?? '0',
                    profile.data.displayCurrency
                  )
                ),
                to: maxAmountMinor
                  ? isolate(
                      formatMinorAmount(
                        maxAmountMinor,
                        profile.data.displayCurrency
                      )
                    )
                  : t('any')
              })}
              trailingIcon={X}
              accessibilityLabel={t('removeAmountFilter')}
              onPress={() => {
                setMinAmountMinor(undefined);
                setMaxAmountMinor(undefined);
              }}
            />
          ) : null}
        </View>
        <PersonalHistorySummary
          displayCurrency={profile.data.displayCurrency}
          report={report}
          title={historyPeriodLabel(fromDate, toDate)}
          type={type}
          loading={
            history.isPending ||
            history.isRefetching ||
            searchText.trim() !== search
          }
          caption={[
            type === 'EXPENSE'
              ? t('expenses')
              : type === 'INCOME'
                ? t('income')
                : undefined,
            selectedCategory ? categoryName(selectedCategory.code) : undefined,
            searchText.trim()
              ? t('quote', { text: isolate(searchText.trim()) })
              : undefined,
            minAmountMinor || maxAmountMinor
              ? t('range', {
                  from: isolate(
                    formatMinorAmount(
                      minAmountMinor ?? '0',
                      profile.data.displayCurrency
                    )
                  ),
                  to: maxAmountMinor
                    ? isolate(
                        formatMinorAmount(
                          maxAmountMinor,
                          profile.data.displayCurrency
                        )
                      )
                    : t('any')
                })
              : undefined,
            !includeShared ? t('sharedExcluded') : undefined
          ]
            .filter(Boolean)
            .join(t('captionSeparator'))}
        />
        {history.error ? (
          <View className="gap-2">
            <ErrorMessage error={history.error} />
            <Button variant="outline" onPress={() => history.refetch()}>
              <Text>{t('tryAgain')}</Text>
            </Button>
          </View>
        ) : null}
        {categories.error ? <ErrorMessage error={categories.error} /> : null}
        {history.isLoading || history.error ? null : groups.length ? (
          groups.map((group) => (
            <View key={group.period} className="gap-2">
              <SectionLabel>
                {periodLabel(group.period, 'MONTH').toUpperCase()}
              </SectionLabel>
              {groupByDay(group.items).map((day) => (
                <View key={day.title}>
                  <DayHeading>{day.title}</DayHeading>
                  {day.items.map((item, index) => (
                    <PersonalHistoryRow
                      key={`${item.kind}-${item.id}`}
                      divided={index > 0}
                      displayCurrency={profile.data.displayCurrency}
                      item={item}
                    />
                  ))}
                </View>
              ))}
            </View>
          ))
        ) : (
          <Text selectable>
            {search || activeFilterCount
              ? t('noHistoryMatchesYourSearchOrFilters')
              : t('noHistoryYet')}
          </Text>
        )}
        {history.hasNextPage ? (
          <Button
            variant="outline"
            disabled={history.isFetchingNextPage}
            accessibilityState={{
              disabled: history.isFetchingNextPage,
              busy: history.isFetchingNextPage
            }}
            onPress={() => history.fetchNextPage()}
          >
            {history.isFetchingNextPage ? (
              <ActivityIndicator className="text-primary" />
            ) : (
              <Text>{t('loadMoreHistory')}</Text>
            )}
          </Button>
        ) : null}
      </Screen>
      <TransactionFilterSheet
        key={filterSheetVersion}
        amountLimitMinor={amountLimitMinor}
        categories={categories.data ?? []}
        displayCurrency={profile.data.displayCurrency}
        filters={{
          type,
          categoryCode,
          fromDate,
          toDate,
          minAmountMinor,
          maxAmountMinor
        }}
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onApply={(filters: TransactionFilters) => {
          setType(filters.type);
          setCategoryCode(filters.categoryCode);
          setFromDate(filters.fromDate);
          setToDate(filters.toDate);
          setMinAmountMinor(filters.minAmountMinor);
          setMaxAmountMinor(filters.maxAmountMinor);
          setFiltersOpen(false);
        }}
      />
    </>
  );
}

function groupByMonth(items: PersonalHistoryItem[]) {
  const groups: { period: string; items: PersonalHistoryItem[] }[] = [];
  for (const item of items) {
    const period = item.occurredAt.slice(0, 7);
    const previous = groups.at(-1);
    if (previous?.period === period) previous.items.push(item);
    else groups.push({ period, items: [item] });
  }
  return groups;
}
