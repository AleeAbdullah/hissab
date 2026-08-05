import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Card, Button, ErrorMessage, Loading, Notice, Row, Screen, SectionLabel } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { ledgerBalancesQuery, userBalancesQuery } from '@/features/balances/api';
import { formatMinorAmount } from '@/features/balances/format';
import { deleteExpense, expenseQuery } from '@/features/expenses/api';

export default function ExpenseDetailScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const expense = useQuery(expenseQuery(expenseId));
  const profile = useQuery(profileQuery);
  const balances = useQuery({ ...ledgerBalancesQuery(expense.data?.ledgerId ?? ''), enabled: Boolean(expense.data) });
  const remove = useMutation({
    mutationFn: () => deleteExpense(expenseId, expense.data!.version),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ledgers', expense.data!.ledgerId] });
      await queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey });
      router.back();
    },
  });
  if (expense.isLoading || profile.isLoading) return <Loading />;
  if (expense.error || profile.error || !expense.data || !profile.data) return <Screen><ErrorMessage error={expense.error ?? profile.error ?? new Error('Expense not found.')} /></Screen>;
  const names = new Map(balances.data?.currencies.flatMap((currency) => currency.members).map((member) => [member.userId, member.displayName]));
  const name = (userId: string) => names.get(userId) ?? 'Member';
  const editable = expense.data.status === 'ACTIVE' && expense.data.createdByUserId === profile.data.id;
  return (
    <Screen>
      {remove.error || balances.error ? <ErrorMessage error={remove.error ?? balances.error} /> : null}
      <SectionLabel>{expense.data.category.name.toUpperCase()}</SectionLabel>
      <Card>
        <Row title={expense.data.description} subtitle={expense.data.occurredAt.slice(0, 10)} detail={formatMinorAmount(expense.data.totalMinor, expense.data.currency)} />
      </Card>
      {expense.data.status === 'DELETED' ? <Notice title="Deleted expense">This record remains in Hissab’s audit history and no longer affects balances.</Notice> : null}
      <Allocations title="PAID BY" items={expense.data.payers} currency={expense.data.currency} name={name} />
      <Allocations title="OWED BY" items={expense.data.participants.map((item) => ({ userId: item.userId, amountMinor: item.owedMinor }))} currency={expense.data.currency} name={name} />
      {editable ? <View style={{ gap: 12 }}><Button title="Edit expense" href={{ pathname: '/expense/[expenseId]/edit', params: { expenseId } }} secondary /><Button title="Delete expense" secondary destructive loading={remove.isPending} onPress={() => Alert.alert('Delete expense?', 'This reverses its balance effect while keeping an auditable record.', [{ text: 'Keep expense', style: 'cancel' }, { text: 'Delete expense', style: 'destructive', onPress: () => remove.mutate() }])} /></View> : null}
    </Screen>
  );
}

function Allocations({ currency, items, name, title }: { currency: Parameters<typeof formatMinorAmount>[1]; items: { userId: string; amountMinor: string }[]; name: (userId: string) => string; title: string }) {
  return <View style={{ gap: 8 }}><SectionLabel>{title}</SectionLabel><Card>{items.map((item) => <Row key={item.userId} title={name(item.userId)} detail={formatMinorAmount(item.amountMinor, currency)} />)}</Card></View>;
}
