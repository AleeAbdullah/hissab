import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Notice, Screen } from '@/components/ui';
import { ledgerBalancesQuery, userBalancesQuery } from '@/features/balances/api';
import { SettlementEditor } from '@/features/settlements/components/settlement-editor';
import { createSettlement } from '@/features/settlements/api';
import { homeQuery } from '@/features/home/api';
import { useLedgerDraft } from '@/features/ledger/draft';

export default function SettlementScreen() {
  const { clearDraft, draft } = useLedgerDraft();
  const balances = useQuery({ ...ledgerBalancesQuery(draft?.ledgerId ?? ''), enabled: Boolean(draft) });
  const create = useMutation({
    mutationFn: (body: Parameters<typeof createSettlement>[1]) => createSettlement(draft!.ledgerId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ledgers', draft!.ledgerId] }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
      ]);
      clearDraft();
      router.back();
    },
  });
  if (!draft) return <Screen><Notice title="Choose a ledger">Open Record payment from an active group or friend ledger.</Notice></Screen>;
  const save = (body: Parameters<typeof createSettlement>[1], createsCredit: boolean) => {
    if (!createsCredit) return create.mutate(body);
    Alert.alert('This creates a credit', 'This payment is more than the current amount payable, or does not match the current balance direction. Hissab will record the credit.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Record payment and create a credit', onPress: () => create.mutate(body) }]);
  };
  return <Screen>{create.error || balances.error ? <ErrorMessage error={create.error ?? balances.error} /> : null}<SettlementEditor balances={balances.data} currentUserId={draft.currentUserId} displayCurrency={draft.displayCurrency} members={draft.members} saving={create.isPending} onSave={save} /></Screen>;
}
