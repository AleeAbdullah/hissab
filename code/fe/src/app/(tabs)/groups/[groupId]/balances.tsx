import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ArrowLeftRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import {
  ErrorMessage,
  IconTile,
  ListRow,
  Loading,
  Screen,
  SectionLabel
} from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { LedgerBalanceCards } from '@/features/balances/components/ledger-balance-cards';
import { groupQuery } from '@/features/groups/api';

export default function GroupBalancesScreen() {
  const { t } = useTranslation(['groups', 'common']);
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
            new Error(t('groupBalancesAreUnavailable'))
          }
        />
      </Screen>
    );

  return (
    <Screen>
      <Stack.Screen
        options={{ title: t('balances'), headerTitleAlign: 'center' }}
      />
      <ListRow
        href={{
          pathname: '/groups/[groupId]/simplified-debts',
          params: { groupId }
        }}
        accessibilityLabel={t('simplifyDebtsSeeTheFewestPaymentsToSettleUp')}
        title={t('simplifyDebts')}
        subtitle={t('seeTheFewestPaymentsToSettleUp')}
        leading={<IconTile icon={ArrowLeftRight} />}
      />
      <SectionLabel>{t('members2')}</SectionLabel>
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
    </Screen>
  );
}
