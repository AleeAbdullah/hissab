import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { X } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';

import type { SharedExpense } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ApiError } from '@/api/transport';
import { ErrorMessage, Loading, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { profileQuery } from '@/features/account/api';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import { replaceExpense, expenseQuery } from '@/features/expenses/api';
import {
  ExpenseEditor,
  type ExpenseFormDraft
} from '@/features/expenses/components/expense-editor';
import { homeQuery } from '@/features/home/api';

export default function EditExpenseScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>();
  const expense = useQuery(expenseQuery(expenseId));
  const dialog = useDialog();
  const [snapshot, setSnapshot] = useState<SharedExpense | null>(
    expense.data ?? null
  );
  if (expense.data && (!snapshot || snapshot.id !== expense.data.id))
    setSnapshot(expense.data);
  const navigation = useNavigation();
  const allowExit = useRef(false);
  const submitting = useRef(false);
  const baseline = useRef<string | undefined>(undefined);
  const [dirty, setDirty] = useState(false);
  const [loadingLatest, setLoadingLatest] = useState(false);
  const onDraftChange = useCallback((value: ExpenseFormDraft | null) => {
    const serialized = JSON.stringify(value);
    baseline.current ??= serialized;
    setDirty(serialized !== baseline.current);
  }, []);
  const profile = useQuery(profileQuery);
  const balances = useQuery({
    ...ledgerBalancesQuery(expense.data?.ledgerId ?? ''),
    enabled: Boolean(expense.data)
  });
  const replace = useMutation({
    mutationFn: (body: Parameters<typeof replaceExpense>[1]) =>
      replaceExpense(expenseId, body),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409)
        dialog(
          'Expense changed',
          'Keep your edits, or load the latest revision. Loading replaces the values in this form.',
          [
            { text: 'Keep editing', style: 'cancel' },
            {
              text: 'Load latest',
              onPress: async () => {
                if (submitting.current) return;
                setLoadingLatest(true);
                try {
                  const latest = await expense.refetch();
                  if (latest.data && !latest.error) {
                    baseline.current = undefined;
                    setDirty(false);
                    setSnapshot(latest.data);
                    replace.reset();
                  }
                } finally {
                  setLoadingLatest(false);
                }
              }
            }
          ],
          { tone: 'warning' }
        );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ledgers', snapshot!.ledgerId]
        }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['personal'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({
          queryKey: expenseQuery(expenseId).queryKey
        }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      allowExit.current = true;
      router.back();
    },
    onSettled: () => {
      submitting.current = false;
    }
  });
  usePreventRemove(dirty || replace.isPending || loadingLatest, ({ data }) => {
    if (allowExit.current) {
      navigation.dispatch(data.action);
      return;
    }
    if (submitting.current || replace.isPending || loadingLatest) return;
    dialog(
      'Discard changes?',
      'Your changes have not been saved. The recorded history stays unchanged.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard changes',
          style: 'destructive',
          onPress: () => {
            allowExit.current = true;
            navigation.dispatch(data.action);
          }
        }
      ]
    );
  });
  const busy = replace.isPending || replace.isSuccess || loadingLatest;
  if (
    (expense.isLoading && !expense.data) ||
    (profile.isLoading && !profile.data) ||
    (balances.isLoading && !balances.data) ||
    (expense.data && !snapshot)
  )
    return <Loading />;
  if (!expense.data || !profile.data || !balances.data)
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
    <>
      <Stack.Screen
        options={{
          title: 'Edit expense',
          gestureEnabled: !busy,
          headerRight: () => (
            <Button
              className="w-12 px-0"
              variant="ghost"
              disabled={busy}
              accessibilityLabel="Close editor"
              onPress={() => router.back()}
            >
              <Icon as={X} size={22} />
            </Button>
          )
        }}
      />
      <ExpenseEditor
        key={`${snapshot?.id}:${snapshot?.version}`}
        error={
          replace.error ?? expense.error ?? profile.error ?? balances.error
        }
        currentUserId={profile.data.id}
        displayCurrency={profile.data.displayCurrency}
        expense={snapshot ?? expense.data}
        members={members}
        saving={busy}
        onDraftChange={onDraftChange}
        onDiscard={() => router.back()}
        onSave={(body) => {
          if (submitting.current || busy) return;
          submitting.current = true;
          replace.mutate({ ...body, expectedVersion: snapshot!.version });
        }}
      />
    </>
  );
}
