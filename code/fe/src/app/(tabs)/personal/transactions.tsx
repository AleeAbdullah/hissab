import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router/stack';
import { ListFilter, Search, X } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, TextInput, View } from 'react-native';

import type {
  PersonalCategoryCode,
  PersonalHistoryItem,
  PersonalTransactionType
} from '@/api/contracts';
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
import { periodLabel } from '@/features/personal/form';
import { dateToIso, dateToExclusiveIso, formatPeriod } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

export default function TransactionsScreen() {
  const [includeShared, setIncludeShared] = useState(true);
  const [type, setType] = useState<PersonalTransactionType | undefined>();
  const [categoryCode, setCategoryCode] = useState<
    PersonalCategoryCode | undefined
  >();
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();
  const [minAmountMinor, setMinAmountMinor] = useState<string | undefined>();
  const [maxAmountMinor, setMaxAmountMinor] = useState<string | undefined>();
  const [searchOpen, setSearchOpen] = useState(false);
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
  const closeSearch = () => {
    setSearchOpen(false);
    setSearchText('');
    setSearch('');
    Keyboard.dismiss();
  };
  if (profile.isLoading) return <Loading />;
  if (profile.error || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={profile.error ?? new Error('Profile is unavailable.')}
        />
      </Screen>
    );

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: searchOpen
            ? () => (
                <TextInput
                  autoFocus
                  accessibilityLabel="Search personal history"
                  placeholder="Search history"
                  returnKeyType="search"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={100}
                  value={searchText}
                  onChangeText={setSearchText}
                  className="h-10 w-[190px] rounded-xl bg-muted px-3 text-base text-foreground placeholder:text-muted-foreground"
                />
              )
            : 'History',
          headerRight: () => (
            <View className="flex-row">
              <Button
                className="w-12 px-0"
                variant="ghost"
                accessibilityLabel={
                  searchOpen ? 'Close search' : 'Search history'
                }
                onPress={searchOpen ? closeSearch : () => setSearchOpen(true)}
              >
                <Icon
                  as={searchOpen ? X : Search}
                  size={22}
                  className="text-primary"
                />
              </Button>
              <Button
                className="w-12 px-0"
                variant="ghost"
                accessibilityLabel={
                  sheetFilterCount
                    ? `Filter history, ${sheetFilterCount} selected`
                    : 'Filter history'
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
            </View>
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
            { label: 'All', value: 'ALL' },
            { label: 'Expenses', value: 'EXPENSE' },
            { label: 'Income', value: 'INCOME' }
          ].map((choice) => {
            const selected = (type ?? 'ALL') === choice.value;
            return (
              <Button
                key={choice.value}
                variant="ghost"
                size="compact"
                className="px-0 py-0"
                accessibilityState={{ selected }}
                onPress={() => changeType(choice.value)}
              >
                <View
                  className={
                    selected
                      ? 'min-h-8 justify-center rounded-full bg-primary px-3 py-1'
                      : 'min-h-8 justify-center rounded-full bg-secondary px-3 py-1'
                  }
                >
                  <Text
                    className={
                      selected
                        ? 'text-[15px] font-medium text-primary-foreground'
                        : 'text-[15px] font-medium text-secondary-foreground'
                    }
                  >
                    {choice.label}
                  </Text>
                </View>
              </Button>
            );
          })}
          {categoryCode ? (
            <Button
              variant="ghost"
              size="compact"
              className="px-0 py-0"
              accessibilityLabel={`Remove ${selectedCategory?.name ?? 'category'} filter`}
              onPress={() => setCategoryCode(undefined)}
            >
              <View className="min-h-8 flex-row items-center gap-1 rounded-full border border-primary px-3 py-1">
                <Text className="text-[15px] font-medium text-primary">
                  {selectedCategory?.name ?? 'Category'}
                </Text>
                <Icon as={X} size={14} className="text-primary" />
              </View>
            </Button>
          ) : null}
          {fromDate || toDate ? (
            <Button
              variant="ghost"
              size="compact"
              className="px-0 py-0"
              accessibilityLabel="Remove date filter"
              onPress={() => {
                setFromDate(undefined);
                setToDate(undefined);
              }}
            >
              <View className="min-h-8 flex-row items-center gap-1 rounded-full border border-primary px-3 py-1">
                <Text className="text-[15px] font-medium text-primary">
                  {formatPeriod(fromDate, toDate)}
                </Text>
                <Icon as={X} size={14} className="text-primary" />
              </View>
            </Button>
          ) : null}
          {minAmountMinor || maxAmountMinor ? (
            <Button
              variant="ghost"
              size="compact"
              className="px-0 py-0"
              accessibilityLabel="Remove amount filter"
              onPress={() => {
                setMinAmountMinor(undefined);
                setMaxAmountMinor(undefined);
              }}
            >
              <View className="min-h-8 flex-row items-center gap-1 rounded-full border border-primary px-3 py-1">
                <Text className="text-[15px] font-medium text-primary">
                  {formatMinorAmount(
                    minAmountMinor ?? '0',
                    profile.data.displayCurrency
                  )}{' '}
                  –{' '}
                  {maxAmountMinor
                    ? formatMinorAmount(
                        maxAmountMinor,
                        profile.data.displayCurrency
                      )
                    : 'Any'}
                </Text>
                <Icon as={X} size={14} className="text-primary" />
              </View>
            </Button>
          ) : null}
        </View>
        <PersonalHistorySummary
          displayCurrency={profile.data.displayCurrency}
          report={report}
          title={formatPeriod(fromDate, toDate)}
          type={type}
          loading={
            history.isPending ||
            history.isRefetching ||
            searchText.trim() !== search
          }
          caption={[
            type === 'EXPENSE'
              ? 'Expenses'
              : type === 'INCOME'
                ? 'Income'
                : undefined,
            selectedCategory?.name,
            searchText.trim() ? `“${searchText.trim()}”` : undefined,
            minAmountMinor || maxAmountMinor
              ? `${formatMinorAmount(minAmountMinor ?? '0', profile.data.displayCurrency)}–${maxAmountMinor ? formatMinorAmount(maxAmountMinor, profile.data.displayCurrency) : 'Any'}`
              : undefined,
            !includeShared ? 'Shared excluded' : undefined
          ]
            .filter(Boolean)
            .join(' · ')}
        />
        {history.error ? (
          <View className="gap-2">
            <ErrorMessage error={history.error} />
            <Button variant="outline" onPress={() => history.refetch()}>
              <Text>Try again</Text>
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
              <Card>
                {group.items.map((item) => (
                  <PersonalHistoryRow
                    key={`${item.kind}-${item.id}`}
                    displayCurrency={profile.data.displayCurrency}
                    item={item}
                  />
                ))}
              </Card>
            </View>
          ))
        ) : (
          <Text selectable>
            {search || activeFilterCount
              ? 'No history matches your search or filters.'
              : 'No history yet.'}
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
              <Text>Load more history</Text>
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
