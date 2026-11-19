import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useTranslation } from 'react-i18next';
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
import { isolate } from '@/i18n';
import { formatMinorAmount } from '@/lib/money';

export default function SimplifiedDebtsScreen() {
  const { t } = useTranslation(['groups', 'common']);
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
            new Error(t('simplifiedDebtsAreUnavailable'))
          }
        />
      </Screen>
    );

  const payments = simplifyLedgerBalances(balances.data.members);
  if (!payments)
    return (
      <Screen>
        <ErrorMessage error={new Error(t('groupBalancesDoNotAddUpToZero'))} />
      </Screen>
    );

  return (
    <Screen>
      <Stack.Screen options={{ title: t('simplifiedDebts') }} />
      <SectionLabel>{t('suggestedPayments')}</SectionLabel>
      {payments.length ? (
        <View>
          {payments.map((payment, index) => {
            const payer =
              payment.fromUserId === profile.data.id
                ? t('you')
                : payment.fromDisplayName;
            const recipient =
              payment.toUserId === profile.data.id
                ? t('you2')
                : payment.toDisplayName;
            return (
              <ListRow
                key={`${payment.fromUserId}:${payment.toUserId}`}
                divided={index > 0}
                leading={<Avatar name={payment.fromDisplayName} />}
                title={t(
                  payment.fromUserId === profile.data.id
                    ? 'youPay'
                    : payment.toUserId === profile.data.id
                      ? 'paysYou'
                      : 'personPays',
                  { name: isolate(payer), recipient: isolate(recipient) }
                )}
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
        <Notice title={t('everyoneIsSettled')}>
          {t('noSuggestedPaymentsAreNeededForThisGroup')}
        </Notice>
      )}
      <Text
        selectable
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        {t('suggestionsOnlyNothingChangesUntilSomeoneRecordsOneOfThese')}
      </Text>
    </Screen>
  );
}
