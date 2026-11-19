import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { X } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

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
import { useLedgerName } from '@/features/ledger/use-ledger-name';

export default function EditExpenseScreen() {
  const { t } = useTranslation(['expenses', 'common']);
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
  const ledgerName = useLedgerName(expense.data?.ledgerId);
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
          t('expenseChanged'),
          t('keepYourEditsOrLoadTheLatest'),
          [
            { text: t('keepEditing'), style: 'cancel' },
            {
              text: t('loadLatest'),
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
    dialog(t('confirmDiscardChanges'), t('yourChangesHaveNotBeenSavedThe'), [
      { text: t('keepEditing'), style: 'cancel' },
      {
        text: t('discardChanges'),
        style: 'destructive',
        onPress: () => {
          allowExit.current = true;
          navigation.dispatch(data.action);
        }
      }
    ]);
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
            new Error(t('expenseNotFound'))
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
          error={new Error(t('onlyThePersonWhoRecordedAnActive'))}
        />
      </Screen>
    );
  return (
    <>
      <Stack.Screen
        options={{
          title: t('editExpense'),
          gestureEnabled: !busy,
          headerRight: () => (
            <Button
              className="w-12 px-0"
              variant="ghost"
              disabled={busy}
              accessibilityLabel={t('closeEditor')}
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
        ledgerName={ledgerName ?? ''}
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
