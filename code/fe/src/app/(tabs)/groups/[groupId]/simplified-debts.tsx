import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';

import {
  Card,
  ErrorMessage,
  Loading,
  Notice,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { simplifyLedgerBalances } from '@/features/balances/simplify';
import { formatMinorAmount } from '@/lib/utils';

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
      <Notice title="Suggestions only">
        Nothing here has been applied. Your expenses, history, and balances are
        unchanged.
      </Notice>
      <SectionLabel>SUGGESTED PAYMENTS</SectionLabel>
      {payments.length ? (
        <Card>
          {payments.map((payment) => {
            const payer =
              payment.fromUserId === profile.data.id
                ? 'You'
                : payment.fromDisplayName;
            const recipient =
              payment.toUserId === profile.data.id
                ? 'you'
                : payment.toDisplayName;
            return (
              <Row
                key={`${payment.fromUserId}:${payment.toUserId}`}
                title={`${payer} ${payer === 'You' ? 'pay' : 'pays'} ${recipient}`}
                detail={formatMinorAmount(
                  payment.amountMinor,
                  profile.data.displayCurrency
                )}
              />
            );
          })}
        </Card>
      ) : (
        <Notice title="Everyone is settled">
          No suggested payments are needed for this group.
        </Notice>
      )}
      <Text
        selectable
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        Read-only. To act on a suggestion, record a settlement for it. Hissab
        does not create payments.
      </Text>
    </Screen>
  );
}
