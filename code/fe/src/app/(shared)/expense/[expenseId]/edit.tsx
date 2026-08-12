import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading, Screen } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import { replaceExpense, expenseQuery } from '@/features/expenses/api';
import { homeQuery } from '@/features/home/api';
import { ExpenseEditor } from '@/features/expenses/components/expense-editor';

export default function EditExpenseScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const expense = useQuery(expenseQuery(expenseId));
  const profile = useQuery(profileQuery);
  const balances = useQuery({
    ...ledgerBalancesQuery(expense.data?.ledgerId ?? ''),
    enabled: Boolean(expense.data)
  });
  const replace = useMutation({
    mutationFn: (body: Parameters<typeof replaceExpense>[1]) =>
      replaceExpense(expenseId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ledgers', expense.data!.ledgerId]
        }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({
          queryKey: expenseQuery(expenseId).queryKey
        }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      router.back();
    }
  });
  if (expense.isLoading || profile.isLoading || balances.isLoading)
    return <Loading />;
  if (
    expense.error ||
    profile.error ||
    balances.error ||
    !expense.data ||
    !profile.data ||
    !balances.data
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            expense.error ??
            profile.error ??
            balances.error ??
            new Error('Expense not found.')
          }
        />
      </Screen>
    );
  const members = balances.data.members.map((member) => ({
    userId: member.userId,
    displayName: member.displayName
  }));
  if (
    expense.data.status !== 'ACTIVE' ||
    expense.data.createdByUserId !== profile.data.id
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            new Error(
              'Only the person who recorded an active expense can edit it.'
            )
          }
        />
      </Screen>
    );
  return (
    <Screen>
      {replace.error ? <ErrorMessage error={replace.error} /> : null}
      <ExpenseEditor
        currentUserId={profile.data.id}
        displayCurrency={profile.data.displayCurrency}
        expense={expense.data}
        members={members}
        saving={replace.isPending}
        onSave={(body) =>
          replace.mutate({ ...body, expectedVersion: expense.data.version })
        }
      />
    </Screen>
  );
}
