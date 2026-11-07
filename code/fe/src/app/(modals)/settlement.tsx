import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { X } from 'lucide-react-native';
import { useRef } from 'react';

import { queryClient } from '@/api/query-client';
import { Loading, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import { homeQuery } from '@/features/home/api';
import { useLedgerDraft } from '@/features/ledger/draft';
import { usePersistentDraft } from '@/features/local-data/draft';
import { createSettlement } from '@/features/settlements/api';
import {
  SettlementEditor,
  type SettlementFormDraft
} from '@/features/settlements/components/settlement-editor';

export default function SettlementScreen() {
  const dialog = useDialog();
  const navigation = useNavigation();
  const allowExit = useRef(false);
  const submitting = useRef(false);
  const { clearDraft, draft, ready: ledgerReady } = useLedgerDraft();
  const persistedDraft = usePersistentDraft<SettlementFormDraft>(
    draft ? `settlement:${draft.ledgerId}` : null
  );
  const balances = useQuery({
    ...ledgerBalancesQuery(draft?.ledgerId ?? ''),
    enabled: Boolean(draft)
  });
  const create = useMutation({
    mutationFn: (body: Parameters<typeof createSettlement>[1]) =>
      createSettlement(draft!.ledgerId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ledgers', draft!.ledgerId]
        }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['activity'] })
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
          Open Record payment from an active group or friend ledger.
        </Notice>
      </Screen>
    );
  const discard = () => {
    if (submitting.current || busy) return;
    dialog(
      'Discard draft?',
      'This removes the saved payment details from this device.',
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
          title: 'External payment',
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
      <SettlementEditor
        ledgerName={draft.ledgerName}
        error={create.error ?? balances.error}
        initialPayment={draft.settlement}
        balances={balances.data}
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
