import { useInfiniteQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Button, Card, ErrorMessage, Notice, Row, SectionLabel } from '@/components/ui';
import { formatMinorAmount } from '@/features/balances/format';
import { listExpenses } from '@/features/expenses/api';
import type { LedgerDraftMember } from '@/features/ledger/draft';
import { listSettlements } from '@/features/settlements/api';

export function LedgerActivity({ ledgerId, members }: { ledgerId: string; members: LedgerDraftMember[] }) {
  const expenses = useInfiniteQuery({
    queryKey: ['ledgers', ledgerId, 'expenses'],
    queryFn: ({ pageParam }) => listExpenses(ledgerId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const settlements = useInfiniteQuery({
    queryKey: ['ledgers', ledgerId, 'settlements'],
    queryFn: ({ pageParam }) => listSettlements(ledgerId, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const names = new Map(members.map((member) => [member.userId, member.displayName]));
  const expenseItems = expenses.data?.pages.flatMap((page) => page.items) ?? [];
  const settlementItems = settlements.data?.pages.flatMap((page) => page.items) ?? [];

  if (expenses.error || settlements.error) return <ErrorMessage error={expenses.error ?? settlements.error} />;
  if (expenses.isLoading || settlements.isLoading) return <Notice title="Loading ledger activity">Fetching shared expenses and external payments.</Notice>;
  if (!expenseItems.length && !settlementItems.length) return <Notice title="No ledger activity">Shared expenses and external payments will appear here.</Notice>;

  return (
    <View style={{ gap: 16 }}>
      <ActivitySection title="EXPENSES" items={expenseItems} render={(expense) => <Row key={expense.id} title={expense.description} subtitle={`${expense.category.name} · ${expense.occurredAt.slice(0, 10)}${expense.status === 'DELETED' ? ' · Deleted' : ''}`} detail={formatMinorAmount(expense.totalMinor, expense.currency)} href={{ pathname: '/expense/[expenseId]', params: { expenseId: expense.id } }} />} />
      {expenses.hasNextPage ? <Button title="Load more expenses" secondary loading={expenses.isFetchingNextPage} onPress={() => expenses.fetchNextPage()} /> : null}
      <ActivitySection title="PAYMENTS" items={settlementItems} render={(settlement) => <Row key={settlement.id} title={`${names.get(settlement.fromUserId) ?? 'Member'} paid ${names.get(settlement.toUserId) ?? 'member'}`} subtitle={`${settlement.occurredAt.slice(0, 10)}${settlement.status === 'DELETED' ? ' · Deleted' : ''}`} detail={formatMinorAmount(settlement.amountMinor, settlement.currency)} href={{ pathname: '/payment/[paymentId]', params: { paymentId: settlement.id } }} />} />
      {settlements.hasNextPage ? <Button title="Load more payments" secondary loading={settlements.isFetchingNextPage} onPress={() => settlements.fetchNextPage()} /> : null}
    </View>
  );
}

function ActivitySection<T>({ title, items, render }: { title: string; items: T[]; render: (item: T) => ReactNode }) {
  if (!items.length) return null;
  return <View style={{ gap: 8 }}><SectionLabel>{title}</SectionLabel><Card>{items.map(render)}</Card></View>;
}
