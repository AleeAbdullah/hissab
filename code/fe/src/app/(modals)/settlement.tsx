import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading, Notice, Screen } from '@/components/ui';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import {
  SettlementEditor,
  type SettlementFormDraft
} from '@/features/settlements/components/settlement-editor';
import { createSettlement } from '@/features/settlements/api';
import { homeQuery } from '@/features/home/api';
import { useLedgerDraft } from '@/features/ledger/draft';
import { usePersistentDraft } from '@/features/local-data/draft';

export default function SettlementScreen() {
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
          Open Record payment from an active group or friend ledger.
        </Notice>
      </Screen>
    );
  const save = (
    body: Parameters<typeof createSettlement>[1],
    createsCredit: boolean
  ) => {
    if (!createsCredit) return create.mutate(body);
    Alert.alert(
      'This creates a credit',
      'This payment is more than the current amount payable, or does not match the current balance direction. Hissab will record the credit.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Record payment and create a credit',
          onPress: () => create.mutate(body)
        }
      ]
    );
  };
  const discard = () =>
    Alert.alert(
      'Discard draft?',
      'This removes the saved payment details from this device.',
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
      {create.error || balances.error ? (
        <ErrorMessage error={create.error ?? balances.error} />
      ) : null}
      <SettlementEditor
        balances={balances.data}
        currentUserId={draft.currentUserId}
        displayCurrency={draft.displayCurrency}
        members={draft.members}
        saving={create.isPending}
        onSave={save}
        savedDraft={persistedDraft.draft}
        onDraftChange={persistedDraft.save}
        onDiscard={discard}
      />
    </Screen>
  );
}
