import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { View } from 'react-native';

import {
  Avatar,
  ErrorMessage,
  ListRow,
  Loading,
  Notice,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { simplifyLedgerBalances } from '@/features/balances/simplify';
import { formatMinorAmount } from '@/lib/money';

export default function SimplifiedDebtsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const balances = useQuery(ledgerBalancesQuery(groupId));
  const profile = useQuery(profileQuery);

  if (balances.isLoading || profile.isLoading) return <Loading />;
  if (balances.error || profile.error || !balances.data || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={
            balances.error ??
            profile.error ??
            new Error('Simplified debts are unavailable.')
          }
        />
      </Screen>
    );

  const payments = simplifyLedgerBalances(balances.data.members);
  if (!payments)
    return (
      <Screen>
        <ErrorMessage
          error={new Error('Group balances do not add up to zero.')}
        />
      </Screen>
    );

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Simplified debts' }} />
      <SectionLabel>SUGGESTED PAYMENTS</SectionLabel>
      {payments.length ? (
        <View>
          {payments.map((payment, index) => {
            const payer =
              payment.fromUserId === profile.data.id
                ? 'You'
                : payment.fromDisplayName;
            const recipient =
              payment.toUserId === profile.data.id
                ? 'you'
                : payment.toDisplayName;
            return (
              <ListRow
                key={`${payment.fromUserId}:${payment.toUserId}`}
                divided={index > 0}
                leading={<Avatar name={payment.fromDisplayName} />}
                title={`${payer} ${payer === 'You' ? 'pay' : 'pays'} ${recipient}`}
                trailing={
                  <Text
                    selectable
                    className="text-base font-semibold tabular-nums leading-[22px]"
                  >
                    {formatMinorAmount(
                      payment.amountMinor,
                      profile.data.displayCurrency
                    )}
                  </Text>
                }
              />
            );
          })}
        </View>
      ) : (
        <Notice title="Everyone is settled">
          No suggested payments are needed for this group.
        </Notice>
      )}
      <Text
        selectable
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        Suggestions only. Nothing changes until someone records one of these
        payments.
      </Text>
    </Screen>
  );
}
