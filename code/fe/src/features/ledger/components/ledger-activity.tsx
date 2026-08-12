import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Card, ErrorMessage, Notice, Row, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { DisplayCurrency } from '@/api/contracts';
import { formatMinorAmount } from '@/features/balances/format';
import { listExpenses } from '@/features/expenses/api';
import type { LedgerDraftMember } from '@/features/ledger/draft';
import { listSettlements } from '@/features/settlements/api';

export function LedgerActivity({
  displayCurrency,
  ledgerId,
  members
}: {
  displayCurrency: DisplayCurrency;
  ledgerId: string;
  members: LedgerDraftMember[];
}) {
  const expenses = useInfiniteQuery({
    queryKey: ['ledgers', ledgerId, 'expenses'],
    queryFn: ({ pageParam }) => listExpenses(ledgerId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined
  });
  const settlements = useInfiniteQuery({
    queryKey: ['ledgers', ledgerId, 'settlements'],
    queryFn: ({ pageParam }) => listSettlements(ledgerId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined
  });
  const names = new Map(
    members.map((member) => [member.userId, member.displayName])
  );
  const expenseItems = expenses.data?.pages.flatMap((page) => page.items) ?? [];
  const settlementItems =
    settlements.data?.pages.flatMap((page) => page.items) ?? [];

  if (expenses.error || settlements.error)
    return <ErrorMessage error={expenses.error ?? settlements.error} />;
  if (expenses.isLoading || settlements.isLoading)
    return (
      <Notice title="Loading ledger activity">
        Fetching shared expenses and external payments.
      </Notice>
    );
  if (!expenseItems.length && !settlementItems.length)
    return (
      <Notice title="No ledger activity">
        Shared expenses and external payments will appear here.
      </Notice>
    );

  return (
    <View className="gap-4">
      <ActivitySection
        title="EXPENSES"
        items={expenseItems}
        render={(expense) => (
          <Row
            key={expense.id}
            title={expense.description}
            subtitle={`${expense.category.name} · ${expense.occurredAt.slice(0, 10)}${expense.status === 'DELETED' ? ' · Deleted' : ''}`}
            detail={formatMinorAmount(expense.totalMinor, displayCurrency)}
            href={{
              pathname: '/expense/[expenseId]',
              params: { expenseId: expense.id }
            }}
          />
        )}
      />
      {expenses.hasNextPage ? (
        <Button
          variant="outline"
          disabled={expenses.isFetchingNextPage}
          accessibilityState={{
            disabled: expenses.isFetchingNextPage,
            busy: expenses.isFetchingNextPage
          }}
          onPress={() => expenses.fetchNextPage()}
        >
          {expenses.isFetchingNextPage ? (
            <ActivityIndicator className="text-primary" />
          ) : (
            <Text>Load more expenses</Text>
          )}
        </Button>
      ) : null}
      <ActivitySection
        title="PAYMENTS"
        items={settlementItems}
        render={(settlement) => (
          <Row
            key={settlement.id}
            title={`${names.get(settlement.fromUserId) ?? 'Member'} paid ${names.get(settlement.toUserId) ?? 'member'}`}
            subtitle={`${settlement.occurredAt.slice(0, 10)}${settlement.status === 'DELETED' ? ' · Deleted' : ''}`}
            detail={formatMinorAmount(settlement.amountMinor, displayCurrency)}
            href={{
              pathname: '/payment/[paymentId]',
              params: { paymentId: settlement.id }
            }}
          />
        )}
      />
      {settlements.hasNextPage ? (
        <Button
          variant="outline"
          disabled={settlements.isFetchingNextPage}
          accessibilityState={{
            disabled: settlements.isFetchingNextPage,
            busy: settlements.isFetchingNextPage
          }}
          onPress={() => settlements.fetchNextPage()}
        >
          {settlements.isFetchingNextPage ? (
            <ActivityIndicator className="text-primary" />
          ) : (
            <Text>Load more payments</Text>
          )}
        </Button>
      ) : null}
    </View>
  );
}

function ActivitySection<T>({
  title,
  items,
  render
}: {
  title: string;
  items: T[];
  render: (item: T) => ReactNode;
}) {
  if (!items.length) return null;
  return (
    <View className="gap-2">
      <SectionLabel>{title}</SectionLabel>
      <Card>{items.map(render)}</Card>
    </View>
  );
}
