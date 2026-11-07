import { useMutation } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { X } from 'lucide-react-native';
import { useRef } from 'react';

import { queryClient } from '@/api/query-client';
import { Loading, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { userBalancesQuery } from '@/features/balances/api';
import { createExpense } from '@/features/expenses/api';
import {
  ExpenseEditor,
  type ExpenseFormDraft
} from '@/features/expenses/components/expense-editor';
import { homeQuery } from '@/features/home/api';
import { useLedgerDraft } from '@/features/ledger/draft';
import { usePersistentDraft } from '@/features/local-data/draft';

export default function SharedExpenseScreen() {
  const dialog = useDialog();
  const navigation = useNavigation();
  const allowExit = useRef(false);
  const submitting = useRef(false);
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
        queryClient.invalidateQueries({ queryKey: ['personal'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      allowExit.current = true;
      persistedDraft.clear();
      clearDraft();
      router.back();
    },
    onSettled: () => {
      submitting.current = false;
    }
  });
  usePreventRemove(create.isPending, ({ data }) => {
    if (allowExit.current) navigation.dispatch(data.action);
  });
  const busy = create.isPending || create.isSuccess;
  if (!ledgerReady || !persistedDraft.ready) return <Loading />;
  if (!draft)
    return (
      <Screen>
        <Notice title="Choose a ledger">
          Open Add expense from an active group or friend ledger.
        </Notice>
      </Screen>
    );
  if (draft.members.length < 2)
    return (
      <Screen>
        <Notice title="Invite members first">
          Shared records need at least two active members. Invited people can
          take part after they accept.
        </Notice>
      </Screen>
    );
  const discard = () => {
    if (submitting.current || busy) return;
    dialog(
      'Discard draft?',
      'This removes the saved expense details from this device.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard draft',
          style: 'destructive',
          onPress: () => {
            allowExit.current = true;
            persistedDraft.clear();
            clearDraft();
            router.back();
          }
        }
      ]
    );
  };
  return (
    <>
      <Stack.Screen
        options={{
          title: 'Shared expense',
          gestureEnabled: !busy,
          headerRight: () => (
            <Button
              className="w-12 px-0"
              variant="ghost"
              disabled={busy}
              accessibilityLabel="Close editor"
              onPress={discard}
            >
              <Icon as={X} size={22} />
            </Button>
          )
        }}
      />
      <ExpenseEditor
        ledgerName={draft.ledgerName}
        error={create.error}
        currentUserId={draft.currentUserId}
        displayCurrency={draft.displayCurrency}
        members={draft.members}
        saving={busy}
        onSave={(body) => {
          if (submitting.current || busy) return;
          submitting.current = true;
          create.mutate(body);
        }}
        savedDraft={persistedDraft.draft}
        onDraftChange={persistedDraft.save}
        onDiscard={discard}
      />
    </>
  );
}
