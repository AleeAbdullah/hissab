import { useDialog } from '@/components/ui/dialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

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
  const dialog = useDialog();
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
    dialog(
      'This creates a credit',
      "Anything beyond the current balance becomes credit. Hissab doesn't send money.",
      [
        { text: 'Edit amount', style: 'cancel' },
        {
          text: 'Record with credit',
          onPress: () => create.mutate(body)
        }
      ],
      { tone: 'warning' }
    );
  };
  const discard = () =>
    dialog(
      'Discard draft?',
      'This removes the saved payment details from this device.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
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
