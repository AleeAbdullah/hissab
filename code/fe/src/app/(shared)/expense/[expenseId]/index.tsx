import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Avatar,
  DetailHero,
  ErrorMessage,
  ListRow,
  Loading,
  Notice,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import { deleteExpense, expenseQuery } from '@/features/expenses/api';
import { homeQuery } from '@/features/home/api';
import { useLedgerName } from '@/features/ledger/use-ledger-name';
import { CATEGORY_ICONS } from '@/features/personal/components/category-picker';
import { i18n, isolate } from '@/i18n';
import { categoryName } from '@/i18n/categories';
import { formatDate } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

export default function ExpenseDetailScreen() {
  const { t } = useTranslation(['expenses', 'common']);
  const dialog = useDialog();
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const expense = useQuery(expenseQuery(expenseId));
  const profile = useQuery(profileQuery);
  const ledgerName = useLedgerName(expense.data?.ledgerId);
  const balances = useQuery({
    ...ledgerBalancesQuery(expense.data?.ledgerId ?? ''),
    enabled: Boolean(expense.data)
  });
  const remove = useMutation({
    mutationFn: () => deleteExpense(expenseId, expense.data!.version),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ledgers', expense.data!.ledgerId]
        }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['personal'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      router.back();
    }
  });
  if (expense.isLoading || profile.isLoading) return <Loading />;
  if (expense.error || profile.error || !expense.data || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={
            expense.error ?? profile.error ?? new Error(t('expenseNotFound'))
          }
        />
      </Screen>
    );
  const names = new Map(
    balances.data?.members.map((member) => [member.userId, member.displayName])
  );
  const name = (userId: string) => names.get(userId) ?? t('member');
  const editable =
    expense.data.status === 'ACTIVE' &&
    expense.data.createdByUserId === profile.data.id;
  return (
    <Screen>
      {remove.error || balances.error ? (
        <ErrorMessage error={remove.error ?? balances.error} />
      ) : null}
      <DetailHero
        icon={CATEGORY_ICONS[expense.data.category.code]}
        title={expense.data.description}
        amount={formatMinorAmount(
          expense.data.totalMinor,
          profile.data.displayCurrency
        )}
        meta={[
          categoryName(expense.data.category.code),
          ledgerName,
          formatDate(expense.data.occurredAt)
        ]
          .filter(Boolean)
          .map((value) => isolate(value ?? ''))
          .join(' · ')}
        deleted={expense.data.status === 'DELETED'}
      />
      {expense.data.status === 'ACTIVE' ? (
        <Text
          selectable
          className="text-center text-[15px] font-semibold leading-[22px]"
        >
          {viewerEffect(
            expense.data.payers,
            expense.data.participants,
            profile.data.id,
            profile.data.displayCurrency
          )}
        </Text>
      ) : null}
      {expense.data.status === 'DELETED' ? (
        <Notice title={t('deletedExpense')}>
          {t('thisRecordRemainsInTallySticksAudit')}
        </Notice>
      ) : null}
      <Allocations
        title={t('paidByHeading')}
        items={expense.data.payers}
        displayCurrency={profile.data.displayCurrency}
        name={name}
        viewerId={profile.data.id}
      />
      <Allocations
        title={t('splitBetween')}
        items={expense.data.participants.map((item) => ({
          userId: item.userId,
          amountMinor: item.owedMinor
        }))}
        displayCurrency={profile.data.displayCurrency}
        name={name}
        viewerId={profile.data.id}
      />
      {editable ? (
        <View className="gap-3">
          <Link
            href={{
              pathname: '/expense/[expenseId]/edit',
              params: { expenseId }
            }}
            asChild
          >
            <Button variant="outline" role="link">
              <Text>{t('editExpense')}</Text>
            </Button>
          </Link>
          <Button
            variant="destructiveOutline"
            disabled={remove.isPending}
            accessibilityState={{
              disabled: remove.isPending,
              busy: remove.isPending
            }}
            onPress={() =>
              dialog(
                t('confirmDeleteExpense'),
                t(ledgerName ? 'deleteInLedger' : 'deleteDetails', {
                  description: isolate(expense.data.description),
                  amount: isolate(
                    formatMinorAmount(
                      expense.data.totalMinor,
                      profile.data.displayCurrency
                    )
                  ),
                  ledger: isolate(ledgerName ?? '')
                }),
                [
                  { text: t('keepExpense'), style: 'cancel' },
                  {
                    text: t('deleteExpense'),
                    style: 'destructive',
                    onPress: () => remove.mutate()
                  }
                ]
              )
            }
          >
            {remove.isPending ? (
              <ActivityIndicator className="text-destructive" />
            ) : (
              <Text>{t('deleteExpense')}</Text>
            )}
          </Button>
        </View>
      ) : null}
    </Screen>
  );
}

function Allocations({
  displayCurrency,
  items,
  name,
  title,
  viewerId
}: {
  displayCurrency: Parameters<typeof formatMinorAmount>[1];
  items: { userId: string; amountMinor: string }[];
  name: (userId: string) => string;
  title: string;
  viewerId: string;
}) {
  const { t } = useTranslation(['expenses', 'common']);
  return (
    <View>
      <SectionLabel>{title}</SectionLabel>
      {[...items]
        .sort(
          (a, b) =>
            Number(b.userId === viewerId) - Number(a.userId === viewerId)
        )
        .map((item, index) => (
          <ListRow
            key={item.userId}
            divided={index > 0}
            leading={<Avatar name={name(item.userId)} />}
            title={item.userId === viewerId ? t('you') : name(item.userId)}
            trailing={
              <Text
                selectable
                className="text-base font-semibold tabular-nums leading-[22px]"
              >
                {formatMinorAmount(item.amountMinor, displayCurrency)}
              </Text>
            }
          />
        ))}
    </View>
  );
}

// What this one expense means for the viewer, like Splitwise's "You lent".
function viewerEffect(
  payers: { userId: string; amountMinor: string }[],
  participants: { userId: string; owedMinor: string }[],
  viewerId: string,
  displayCurrency: Parameters<typeof formatMinorAmount>[1]
) {
  const paid = BigInt(
    payers.find((payer) => payer.userId === viewerId)?.amountMinor ?? '0'
  );
  const owed = BigInt(
    participants.find((item) => item.userId === viewerId)?.owedMinor ?? '0'
  );
  const net = paid - owed;
  const amount = formatMinorAmount(
    (net < 0n ? -net : net).toString(),
    displayCurrency
  );
  if (paid === 0n && owed === 0n)
    return i18n.t('expenses:youreNotPartOfThisExpense');
  if (net > 0n) return i18n.t('expenses:youLent', { amount: isolate(amount) });
  if (net < 0n)
    return i18n.t('expenses:youBorrowed', { amount: isolate(amount) });
  return i18n.t('expenses:youPaidYourShare');
}
