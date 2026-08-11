import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, Stack } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Card, ErrorMessage, Loading, Notice, Row, Screen, SectionLabel } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { PersonalSummary } from '@/features/personal/components/personal-summary';
import { PersonalTransactionRow } from '@/features/personal/components/personal-transaction-row';
import { personalReportQuery, personalTransactionsInfiniteQuery } from '@/features/personal/api';
import { periodLabel } from '@/features/personal/form';
import { useAppTheme } from '@/theme/theme';

export default function PersonalScreen() {
  const { colors } = useAppTheme();
  const profile = useQuery(profileQuery);
  const report = useQuery(personalReportQuery({ bucket: 'MONTH' }));
  const transactions = useInfiniteQuery(personalTransactionsInfiniteQuery({}, 5));
  const recent = useMemo(() => transactions.data?.pages.flatMap((page) => page.items) ?? [], [transactions.data]);
  if (profile.isLoading || report.isLoading || transactions.isLoading) return <Loading />;
  if (profile.error || report.error || transactions.error || !profile.data || !report.data) return <Screen><ErrorMessage error={profile.error ?? report.error ?? transactions.error ?? new Error('Personal data is unavailable.')} /></Screen>;
  const current = report.data.buckets.at(-1) ?? { incomeMinor: '0', expenseMinor: '0', netMinor: '0', period: '' };

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <AddTransactionButton color={colors.brand} /> }} />
      <Screen>
        <Notice title="Personal">Only you can see these entries. Shared expenses are included in reports according to your selected report mode.</Notice>
        <PersonalSummary displayCurrency={profile.data.displayCurrency} report={current} title={current.period ? periodLabel(current.period, 'MONTH') : 'This month'} />
        <Card>
          <Row title="Report mode" subtitle={report.data.mode === 'OWED_SHARE' ? 'Your share of shared expenses' : 'Cash you paid toward shared expenses'} href="/report-mode" />
          <Row title="View reports" href="/personal/reports" />
        </Card>
        <View style={{ gap: 8 }}>
          <SectionLabel>RECENT ENTRIES</SectionLabel>
          {recent.length ? <Card>{recent.map((transaction) => <PersonalTransactionRow key={transaction.id} displayCurrency={profile.data.displayCurrency} transaction={transaction} />)}</Card> : <Text selectable>No personal transactions yet.</Text>}
          <Link href="/personal/transactions" asChild><Pressable accessibilityRole="link" style={{ minHeight: 44, alignItems: 'flex-start', justifyContent: 'center' }}><Text style={{ color: colors.brand, fontSize: 16, fontWeight: '600' }}>View all transactions</Text></Pressable></Link>
        </View>
      </Screen>
    </>
  );
}

function AddTransactionButton({ color }: { color: string }) {
  return <Link href="/personal-transaction" asChild><Pressable accessibilityRole="button" accessibilityLabel="Add personal transaction" style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}><Text style={{ color, fontSize: 30, fontWeight: '300' }}>＋</Text></Pressable></Link>;
}
