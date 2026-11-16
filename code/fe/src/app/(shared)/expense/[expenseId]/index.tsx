import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
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
import { formatDate } from '@/lib/dates';
import { formatMinorAmount } from '@/lib/money';

export default function ExpenseDetailScreen() {
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
            expense.error ?? profile.error ?? new Error('Expense not found.')
          }
        />
      </Screen>
    );
  const names = new Map(
    balances.data?.members.map((member) => [member.userId, member.displayName])
  );
  const name = (userId: string) => names.get(userId) ?? 'Member';
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
          expense.data.category.name,
          ledgerName,
          formatDate(expense.data.occurredAt)
        ]
          .filter(Boolean)
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
        <Notice title="Deleted expense">
          This record remains in Tally Stick’s audit history and no longer
          affects balances.
        </Notice>
      ) : null}
      <Allocations
        title="PAID BY"
        items={expense.data.payers}
        displayCurrency={profile.data.displayCurrency}
        name={name}
        viewerId={profile.data.id}
      />
      <Allocations
        title="SPLIT BETWEEN"
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
              <Text>Edit expense</Text>
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
                'Delete expense?',
                `Delete “${expense.data.description}” (${formatMinorAmount(expense.data.totalMinor, profile.data.displayCurrency)})${ledgerName ? ` in ${ledgerName}` : ''}? It stops counting in balances; its history stays visible.`,
                [
                  { text: 'Keep expense', style: 'cancel' },
                  {
                    text: 'Delete expense',
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
              <Text>Delete expense</Text>
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
            title={item.userId === viewerId ? 'You' : name(item.userId)}
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
  if (paid === 0n && owed === 0n) return "You're not part of this expense";
  if (net > 0n) return `You lent ${amount}`;
  if (net < 0n) return `You borrowed ${amount}`;
  return 'You paid your share';
}
