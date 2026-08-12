import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading, Notice, Screen } from '@/components/ui';
import { userBalancesQuery } from '@/features/balances/api';
import { createExpense } from '@/features/expenses/api';
import { homeQuery } from '@/features/home/api';
import {
  ExpenseEditor,
  type ExpenseFormDraft
} from '@/features/expenses/components/expense-editor';
import { useLedgerDraft } from '@/features/ledger/draft';
import { usePersistentDraft } from '@/features/local-data/draft';

export default function SharedExpenseScreen() {
  const { clearDraft, draft, ready: ledgerReady } = useLedgerDraft();
  const persistedDraft = usePersistentDraft<ExpenseFormDraft>(
    draft ? `shared-expense:${draft.ledgerId}` : null
  );
  const create = useMutation({
    mutationFn: (body: Parameters<typeof createExpense>[1]) =>
      createExpense(draft!.ledgerId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ledgers', draft!.ledgerId]
        }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      persistedDraft.clear();
      clearDraft();
      router.back();
    }
  });
  if (!ledgerReady || !persistedDraft.ready) return <Loading />;
  if (!draft)
    return (
      <Screen>
        <Notice title="Choose a ledger">
          Open Add expense from an active group or friend ledger.
        </Notice>
      </Screen>
    );
  const discard = () =>
    Alert.alert(
      'Discard draft?',
      'This removes the saved expense details from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard draft',
          style: 'destructive',
          onPress: () => {
            persistedDraft.clear();
            clearDraft();
            router.back();
          }
        }
      ]
    );
  return (
    <Screen>
      {create.error ? <ErrorMessage error={create.error} /> : null}
      <ExpenseEditor
        currentUserId={draft.currentUserId}
        displayCurrency={draft.displayCurrency}
        members={draft.members}
        saving={create.isPending}
        onSave={(body) => create.mutate(body)}
        savedDraft={persistedDraft.draft}
        onDraftChange={persistedDraft.save}
        onDiscard={discard}
      />
    </Screen>
  );
}
