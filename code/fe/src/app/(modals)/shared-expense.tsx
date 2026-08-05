import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Notice, Screen } from '@/components/ui';
import { userBalancesQuery } from '@/features/balances/api';
import { createExpense } from '@/features/expenses/api';
import { ExpenseEditor } from '@/features/expenses/components/expense-editor';
import { useLedgerDraft } from '@/features/ledger/draft';

export default function SharedExpenseScreen() {
  const { clearDraft, draft } = useLedgerDraft();
  const create = useMutation({
    mutationFn: (body: Parameters<typeof createExpense>[1]) => createExpense(draft!.ledgerId, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['ledgers', draft!.ledgerId] });
      await queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey });
      clearDraft();
      router.back();
    },
  });
  if (!draft) return <Screen><Notice title="Choose a ledger">Open Add expense from an active group or friend ledger.</Notice></Screen>;
  return <Screen>{create.error ? <ErrorMessage error={create.error} /> : null}<ExpenseEditor currentUserId={draft.currentUserId} defaultCurrency={draft.defaultCurrency} members={draft.members} saving={create.isPending} onSave={(body) => create.mutate(body)} /></Screen>;
}
