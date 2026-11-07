import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { FileText, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { ErrorMessage, Row } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { listExpenses } from '@/features/expenses/api';
import type { LedgerDraftMember } from '@/features/ledger/draft';
import { listSettlements } from '@/features/settlements/api';
import { formatDate } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

export function LedgerActivity({
  displayCurrency,
  ledgerId,
  ledgerName,
  members
}: {
  displayCurrency: DisplayCurrency;
  ledgerId: string;
  ledgerName?: string;
  members: LedgerDraftMember[];
}) {
  const { fontScale } = useWindowDimensions();
  const [tab, setTab] = useState<'expenses' | 'payments'>('expenses');
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
  const selected = tab === 'expenses' ? expenses : settlements;
  const empty =
    tab === 'expenses' ? !expenseItems.length : !settlementItems.length;
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-xl font-semibold">
        Records
      </Text>
      <View className="flex-row rounded-xl bg-muted p-1">
        {(['expenses', 'payments'] as const).map((value) => (
          <Button
            key={value}
            variant="ghost"
            role="tab"
            className={tab === value ? 'flex-1 bg-card px-2' : 'flex-1 px-2'}
            accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
          >
            <Text
              className={
                tab === value ? 'text-primary' : 'text-muted-foreground'
              }
            >
              {value === 'expenses' ? 'Expenses' : 'Payments'}
            </Text>
          </Button>
        ))}
      </View>
      {selected.error ? (
        <>
          <ErrorMessage error={selected.error} />
          <Button variant="outline" onPress={() => selected.refetch()}>
            <Text>Retry</Text>
          </Button>
        </>
      ) : null}
      {selected.isLoading ? (
        <ActivityIndicator className="text-primary" />
      ) : empty && selected.isSuccess ? (
        <View className="items-center gap-2 py-8">
          <Icon as={FileText} size={28} className="text-muted-foreground" />
          <Text selectable className="text-lg font-semibold">
            No {tab === 'expenses' ? 'expenses' : 'payments'} yet
          </Text>
          <Text selectable className="text-center text-muted-foreground">
            Shared expenses and external payments
            {ledgerName ? ` in ${ledgerName}` : ''} appear here.
          </Text>
        </View>
      ) : empty ? null : tab === 'expenses' ? (
        expenseItems.map((expense) => (
          <Row
            className="px-0"
            detailClassName="text-foreground"
            key={expense.id}
            title={
              fontScale >= 1.3
                ? `${expense.description}\n${formatMinorAmount(expense.totalMinor, displayCurrency)}`
                : expense.description
            }
            subtitle={`${expense.category.name} · ${formatDate(expense.occurredAt)}${expense.status === 'DELETED' ? ' · Deleted' : ''}`}
            detail={
              fontScale >= 1.3
                ? undefined
                : formatMinorAmount(expense.totalMinor, displayCurrency)
            }
            href={{
              pathname: '/expense/[expenseId]',
              params: { expenseId: expense.id }
            }}
          />
        ))
      ) : (
        settlementItems.map((settlement) => (
          <Row
            className="px-0"
            detailClassName="text-foreground"
            key={settlement.id}
            title={`${names.get(settlement.fromUserId) ?? 'Member'} paid ${names.get(settlement.toUserId) ?? 'member'}${fontScale >= 1.3 ? `\n${formatMinorAmount(settlement.amountMinor, displayCurrency)}` : ''}`}
            subtitle={`${formatDate(settlement.occurredAt)}${settlement.status === 'DELETED' ? ' · Deleted' : ''}`}
            detail={
              fontScale >= 1.3
                ? undefined
                : formatMinorAmount(settlement.amountMinor, displayCurrency)
            }
            href={{
              pathname: '/payment/[paymentId]',
              params: { paymentId: settlement.id }
            }}
          />
        ))
      )}
      {selected.hasNextPage ? (
        <Button
          variant="outline"
          disabled={selected.isFetchingNextPage}
          accessibilityState={{
            disabled: selected.isFetchingNextPage,
            busy: selected.isFetchingNextPage
          }}
          onPress={() => selected.fetchNextPage()}
        >
          <Text>
            {selected.isFetchingNextPage ? 'Loading…' : `Load more ${tab}`}
          </Text>
        </Button>
      ) : null}
      <Link
        href={{ pathname: '/activity', params: { ledgerId, ledgerName } }}
        asChild
      >
        <Button
          variant="link"
          size="compact"
          role="link"
          className="justify-start px-0"
        >
          <Text>See all in Activity</Text>
          <Icon as={ChevronRight} size={20} className="text-primary" />
        </Button>
      </Link>
    </View>
  );
}
