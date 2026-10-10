import { useDialog } from '@/components/ui/dialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';

import { queryClient } from '@/api/query-client';
import type { ReplaceSettlementDto } from '@/api/generated/types.gen';
import { ErrorMessage, Loading, Screen } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import { SettlementEditor } from '@/features/settlements/components/settlement-editor';
import { homeQuery } from '@/features/home/api';
import { replaceSettlement, settlementQuery } from '@/features/settlements/api';

export default function EditPaymentScreen() {
  const dialog = useDialog();
  const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
  const settlement = useQuery(settlementQuery(paymentId));
  const profile = useQuery(profileQuery);
  const balances = useQuery({
    ...ledgerBalancesQuery(settlement.data?.ledgerId ?? ''),
    enabled: Boolean(settlement.data)
  });
  const replace = useMutation({
    mutationFn: (body: Parameters<typeof replaceSettlement>[1]) =>
      replaceSettlement(paymentId, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['ledgers', settlement.data!.ledgerId]
        }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({
          queryKey: settlementQuery(paymentId).queryKey
        }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      router.back();
    }
  });
  if (settlement.isLoading || profile.isLoading || balances.isLoading)
    return <Loading />;
  if (
    settlement.error ||
    profile.error ||
    balances.error ||
    !settlement.data ||
    !profile.data ||
    !balances.data
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            settlement.error ??
            profile.error ??
            balances.error ??
            new Error('Payment not found.')
          }
        />
      </Screen>
    );
  const members = balances.data.members.map((member) => ({
    userId: member.userId,
    displayName: member.displayName
  }));
  if (
    settlement.data.status !== 'ACTIVE' ||
    settlement.data.createdByUserId !== profile.data.id
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            new Error(
              'Only the person who recorded an active payment can edit it.'
            )
          }
        />
      </Screen>
    );
  const save = (
    body: Omit<ReplaceSettlementDto, 'expectedVersion'>,
    createsCredit: boolean
  ) => {
    const record = () =>
      replace.mutate({ ...body, expectedVersion: settlement.data!.version });
    if (!createsCredit) return record();
    dialog(
      'This creates a credit',
      "Anything beyond the current balance becomes credit. Hissab doesn't send money.",
      [
        { text: 'Edit amount', style: 'cancel' },
        { text: 'Save with credit', onPress: record }
      ],
      { tone: 'warning' }
    );
  };
  return (
    <Screen>
      {replace.error ? <ErrorMessage error={replace.error} /> : null}
      <SettlementEditor
        balances={balances.data}
        currentUserId={profile.data.id}
        displayCurrency={profile.data.displayCurrency}
        members={members}
        saving={replace.isPending}
        settlement={settlement.data}
        onSave={save}
      />
    </Screen>
  );
}
