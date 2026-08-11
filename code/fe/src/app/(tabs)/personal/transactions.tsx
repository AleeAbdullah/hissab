import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { PersonalCategoryCode, PersonalTransaction, PersonalTransactionType } from '@/api/contracts';
import { Card, ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { ChoiceChips } from '@/components/choice-chips';
import { PersonalTransactionRow } from '@/features/personal/components/personal-transaction-row';
import { personalCategoriesQuery, personalTransactionsInfiniteQuery } from '@/features/personal/api';
import { periodLabel } from '@/features/personal/form';

export default function TransactionsScreen() {
  const [type, setType] = useState<PersonalTransactionType | undefined>();
  const [categoryCode, setCategoryCode] = useState<PersonalCategoryCode | undefined>();
  const profile = useQuery(profileQuery);
  const categories = useQuery(personalCategoriesQuery);
  const transactions = useInfiniteQuery(personalTransactionsInfiniteQuery({ type, categoryCode }));
  const items = useMemo(() => transactions.data?.pages.flatMap((page) => page.items) ?? [], [transactions.data]);
  const groups = useMemo(() => groupByMonth(items), [items]);
  const availableCategories = (categories.data ?? []).filter((category) => !type || category.kind === type);
  const changeType = (value: string) => {
    const next = value === 'ALL' ? undefined : value as PersonalTransactionType;
    setType(next);
    if (categoryCode && !(categories.data ?? []).some((category) => (!next || category.kind === next) && category.code === categoryCode)) setCategoryCode(undefined);
  };
  if (profile.isLoading || transactions.isLoading) return <Loading />;
  if (profile.error || transactions.error || !profile.data) return <Screen><ErrorMessage error={profile.error ?? transactions.error ?? new Error('Transactions are unavailable.')} /></Screen>;

  return (
    <Screen>
      {categories.error ? <ErrorMessage error={categories.error} /> : null}
      <View className="gap-2">
        <SectionLabel>TYPE</SectionLabel>
        <ChoiceChips choices={[{ label: 'All', value: 'ALL' }, { label: 'Expenses', value: 'EXPENSE' }, { label: 'Income', value: 'INCOME' }]} value={type ?? 'ALL'} onChange={changeType} />
      </View>
      <View className="gap-2">
        <SectionLabel>CATEGORY</SectionLabel>
        <ChoiceChips choices={[{ label: 'All categories', value: 'ALL' }, ...availableCategories.map((category) => ({ label: category.name, value: category.code }))]} value={categoryCode ?? 'ALL'} onChange={(value) => setCategoryCode(value === 'ALL' ? undefined : value as PersonalCategoryCode)} />
      </View>
      {groups.length ? groups.map((group) => <View key={group.period} className="gap-2"><SectionLabel>{periodLabel(group.period, 'MONTH').toUpperCase()}</SectionLabel><Card>{group.items.map((transaction) => <PersonalTransactionRow key={transaction.id} displayCurrency={profile.data.displayCurrency} transaction={transaction} />)}</Card></View>) : <Text selectable>No entries match these filters.</Text>}
      {transactions.hasNextPage ? <Button variant="outline" disabled={transactions.isFetchingNextPage} accessibilityState={{ disabled: transactions.isFetchingNextPage, busy: transactions.isFetchingNextPage }} onPress={() => transactions.fetchNextPage()}>{transactions.isFetchingNextPage ? <ActivityIndicator className="text-primary" /> : <Text>Load more transactions</Text>}</Button> : null}
    </Screen>
  );
}

function groupByMonth(items: PersonalTransaction[]) {
  const groups: { period: string; items: PersonalTransaction[] }[] = [];
  for (const item of items) {
    const period = item.occurredAt.slice(0, 7);
    const previous = groups.at(-1);
    if (previous?.period === period) previous.items.push(item);
    else groups.push({ period, items: [item] });
  }
  return groups;
}
