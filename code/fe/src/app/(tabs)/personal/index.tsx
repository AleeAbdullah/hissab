import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, Stack } from 'expo-router';
import { useMemo } from 'react';
import { View } from 'react-native';

import {
  Card,
  ErrorMessage,
  Loading,
  Notice,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { PersonalSummary } from '@/features/personal/components/personal-summary';
import { PersonalTransactionRow } from '@/features/personal/components/personal-transaction-row';
import {
  personalReportQuery,
  personalTransactionsInfiniteQuery
} from '@/features/personal/api';
import { periodLabel } from '@/features/personal/form';

export default function PersonalScreen() {
  const profile = useQuery(profileQuery);
  const report = useQuery(personalReportQuery({ bucket: 'MONTH' }));
  const transactions = useInfiniteQuery(
    personalTransactionsInfiniteQuery({}, 5)
  );
  const recent = useMemo(
    () => transactions.data?.pages.flatMap((page) => page.items) ?? [],
    [transactions.data]
  );
  if (profile.isLoading || report.isLoading || transactions.isLoading)
    return <Loading />;
  if (
    profile.error ||
    report.error ||
    transactions.error ||
    !profile.data ||
    !report.data
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            profile.error ??
            report.error ??
            transactions.error ??
            new Error('Personal data is unavailable.')
          }
        />
      </Screen>
    );
  const current = report.data.buckets.at(-1) ?? {
    incomeMinor: '0',
    expenseMinor: '0',
    netMinor: '0',
    period: ''
  };

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <AddTransactionButton /> }} />
      <Screen>
        <Notice title="Personal">
          Only you can see these entries. Shared expenses are included in
          reports according to your selected report mode.
        </Notice>
        <PersonalSummary
          displayCurrency={profile.data.displayCurrency}
          report={current}
          title={
            current.period ? periodLabel(current.period, 'MONTH') : 'This month'
          }
        />
        <Card>
          <Row
            title="Report mode"
            subtitle={
              report.data.mode === 'OWED_SHARE'
                ? 'Your share of shared expenses'
                : 'Cash you paid toward shared expenses'
            }
            href="/report-mode"
          />
          <Row title="View reports" href="/personal/reports" />
        </Card>
        <View className="gap-2">
          <SectionLabel>RECENT ENTRIES</SectionLabel>
          {recent.length ? (
            <Card>
              {recent.map((transaction) => (
                <PersonalTransactionRow
                  key={transaction.id}
                  displayCurrency={profile.data.displayCurrency}
                  transaction={transaction}
                />
              ))}
            </Card>
          ) : (
            <Text selectable>No personal transactions yet.</Text>
          )}
          <Link href="/personal/transactions" asChild>
            <Button variant="link" role="link" className="self-start px-0">
              <Text>View all transactions</Text>
            </Button>
          </Link>
        </View>
      </Screen>
    </>
  );
}

function AddTransactionButton() {
  return (
    <Link href="/personal-transaction" asChild>
      <Button
        variant="ghost"
        size="icon"
        role="link"
        accessibilityLabel="Add personal transaction"
      >
        <Text className="text-[30px] font-light text-primary">＋</Text>
      </Button>
    </Link>
  );
}
