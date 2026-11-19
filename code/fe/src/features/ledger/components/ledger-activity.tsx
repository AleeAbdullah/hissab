import { useInfiniteQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import { ArrowLeftRight, ChevronRight } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import {
  DayHeading,
  ErrorMessage,
  IconTile,
  ListRow,
  SectionLabel,
  SegmentedControl
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { groupByDay } from '@/features/activity/presentation';
import { listExpenses } from '@/features/expenses/api';
import type { LedgerDraftMember } from '@/features/ledger/draft';
import { CATEGORY_ICONS } from '@/features/personal/components/category-picker';
import { listSettlements } from '@/features/settlements/api';
import { isolate } from '@/i18n';
import { categoryName } from '@/i18n/categories';
import { formatMinorAmount } from '@/lib/money';

type RecordItem = {
  id: string;
  occurredAt: string;
  title: string;
  subtitle: string;
  amount: string;
  icon: LucideIcon;
  href: Href;
};

export function LedgerActivity({
  displayCurrency,
  ledgerId,
  ledgerName,
  members,
  currentUserId
}: {
  displayCurrency: DisplayCurrency;
  ledgerId: string;
  ledgerName?: string;
  members: LedgerDraftMember[];
  currentUserId: string;
}) {
  const { t } = useTranslation(['ledger', 'common']);
  const recordTabs = [
    { value: 'expenses', label: t('expenses') },
    { value: 'payments', label: t('payments') }
  ] as const;
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
  const name = (userId: string, fallback: string) =>
    userId === currentUserId ? t('you') : (names.get(userId) ?? fallback);
  const expenseItems = expenses.data?.pages.flatMap((page) => page.items) ?? [];
  const settlementItems =
    settlements.data?.pages.flatMap((page) => page.items) ?? [];
  const selected = tab === 'expenses' ? expenses : settlements;
  const records: RecordItem[] =
    tab === 'expenses'
      ? expenseItems.map((expense) => {
          const payer =
            expense.payers.length === 1 ? expense.payers[0] : undefined;
          return {
            id: expense.id,
            occurredAt: expense.occurredAt,
            title: expense.description,
            subtitle:
              expense.status === 'DELETED'
                ? t('deletedCategory', {
                    category: categoryName(expense.category.code)
                  })
                : payer?.userId === currentUserId
                  ? t('youPaidCategory', {
                      category: categoryName(expense.category.code)
                    })
                  : !payer
                    ? t('payersCategory', {
                        count: expense.payers.length,
                        category: categoryName(expense.category.code)
                      })
                    : t('paidCategory', {
                        name: isolate(names.get(payer.userId) ?? t('aMember')),
                        category: categoryName(expense.category.code)
                      }),
            amount: formatMinorAmount(expense.totalMinor, displayCurrency),
            icon: CATEGORY_ICONS[expense.category.code],
            href: {
              pathname: '/expense/[expenseId]',
              params: { expenseId: expense.id }
            }
          };
        })
      : settlementItems.map((settlement) => {
          const to = name(settlement.toUserId, t('member'));
          return {
            id: settlement.id,
            occurredAt: settlement.occurredAt,
            title: t(
              settlement.fromUserId === currentUserId
                ? 'youPaidPerson'
                : settlement.toUserId === currentUserId
                  ? 'paidYou'
                  : 'paidPerson',
              {
                name: isolate(name(settlement.fromUserId, t('member2'))),
                recipient: isolate(to)
              }
            ),
            subtitle:
              settlement.status === 'DELETED'
                ? t('paymentDeleted')
                : t('payment'),
            amount: formatMinorAmount(settlement.amountMinor, displayCurrency),
            icon: ArrowLeftRight,
            href: {
              pathname: '/payment/[paymentId]',
              params: { paymentId: settlement.id }
            }
          };
        });
  const empty = !records.length;
  return (
    <View className="gap-3">
      <SectionLabel>{t('records')}</SectionLabel>
      <SegmentedControl options={recordTabs} value={tab} onChange={setTab} />
      {selected.error ? (
        <>
          <ErrorMessage error={selected.error} />
          <Button variant="outline" onPress={() => selected.refetch()}>
            <Text>{t('retry')}</Text>
          </Button>
        </>
      ) : null}
      {selected.isLoading ? (
        <ActivityIndicator className="text-primary" />
      ) : empty && selected.isSuccess ? (
        <Text selectable className="py-6 text-center text-muted-foreground">
          {t(tab === 'expenses' ? 'noExpenses' : 'noPayments')}
        </Text>
      ) : empty ? null : (
        groupByDay(records).map((day) => (
          <View key={day.title}>
            <DayHeading>{day.title}</DayHeading>
            {day.items.map((record, index) => (
              <ListRow
                key={record.id}
                href={record.href}
                title={record.title}
                subtitle={record.subtitle}
                divided={index > 0}
                accessibilityLabel={t('label', {
                  title: isolate(record.title),
                  summary: isolate(record.subtitle),
                  amount: isolate(record.amount)
                })}
                leading={<IconTile icon={record.icon} />}
                trailing={
                  <Text
                    selectable
                    className="text-base font-semibold tabular-nums leading-[22px]"
                  >
                    {record.amount}
                  </Text>
                }
              />
            ))}
          </View>
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
            {selected.isFetchingNextPage
              ? t('loading')
              : t(tab === 'expenses' ? 'moreExpenses' : 'morePayments')}
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
          <Text>{t('seeAllInActivity')}</Text>
          <Icon as={ChevronRight} size={20} className="text-primary" />
        </Button>
      </Link>
    </View>
  );
}
