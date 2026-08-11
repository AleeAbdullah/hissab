import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { LedgerBalanceCards } from '@/features/balances/components/ledger-balance-cards';

export default function GroupBalancesScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const balances = useQuery(ledgerBalancesQuery(groupId));
  const profile = useQuery(profileQuery);

  if (balances.isLoading || profile.isLoading) return <Loading />;
  if (balances.error || profile.error || !balances.data || !profile.data) return <Screen><ErrorMessage error={balances.error ?? profile.error ?? new Error('Group balances are unavailable.')} /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Group balances' }} />
      <SectionLabel>BALANCES</SectionLabel>
      <LedgerBalanceCards balances={balances.data} displayCurrency={profile.data.displayCurrency} />
    </Screen>
  );
}
