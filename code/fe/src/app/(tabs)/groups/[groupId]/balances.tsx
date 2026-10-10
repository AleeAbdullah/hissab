import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { Card, ErrorMessage, Loading, Row, Screen } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { LedgerBalanceCards } from '@/features/balances/components/ledger-balance-cards';
import { groupQuery } from '@/features/groups/api';

export default function GroupBalancesScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const balances = useQuery(ledgerBalancesQuery(groupId));
  const group = useQuery(groupQuery(groupId));
  const profile = useQuery(profileQuery);

  if (balances.isLoading || group.isLoading || profile.isLoading)
    return <Loading />;
  if (
    balances.error ||
    group.error ||
    profile.error ||
    !balances.data ||
    !group.data ||
    !profile.data
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            balances.error ??
            group.error ??
            profile.error ??
            new Error('Group balances are unavailable.')
          }
        />
      </Screen>
    );

  return (
    <Screen>
      <Stack.Screen
        options={{ title: 'Group balances', headerTitleAlign: 'center' }}
      />
      <LedgerBalanceCards
        balances={balances.data}
        canRemind={
          group.data.status === 'ACTIVE' &&
          group.data.membershipStatus === 'ACTIVE'
        }
        currentUserId={profile.data.id}
        displayCurrency={profile.data.displayCurrency}
        ledgerName={group.data.name}
      />
      <Card>
        <Row
          title="Simplify debts"
          subtitle="View read-only suggested payments"
          href={{
            pathname: '/groups/[groupId]/simplified-debts',
            params: { groupId }
          }}
        />
      </Card>
    </Screen>
  );
}
