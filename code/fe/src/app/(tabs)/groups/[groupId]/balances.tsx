import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { LedgerBalanceCards } from '@/features/balances/components/ledger-balance-cards';

export default function GroupBalancesScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const balances = useQuery(ledgerBalancesQuery(groupId));

  if (balances.isLoading) return <Loading />;
  if (balances.error || !balances.data) return <Screen><ErrorMessage error={balances.error ?? new Error('Group balances are unavailable.')} /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Group balances' }} />
      <SectionLabel>BALANCES BY CURRENCY</SectionLabel>
      <LedgerBalanceCards balances={balances.data} />
    </Screen>
  );
}
