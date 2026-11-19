import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { DisplayCurrency, LedgerBalances } from '@/api/contracts';
import { Avatar, ListRow } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { BalanceReminder } from '@/features/balances/components/balance-reminder';
import { NetBalance } from '@/features/balances/components/net-balance';

export function LedgerBalanceCards({
  balances,
  canRemind = true,
  currentUserId,
  displayCurrency,
  ledgerName
}: {
  balances: LedgerBalances;
  canRemind?: boolean;
  currentUserId: string;
  displayCurrency: DisplayCurrency;
  ledgerName: string;
}) {
  const { t } = useTranslation(['balances', 'common']);
  const own = BigInt(
    balances.members.find((member) => member.userId === currentUserId)
      ?.netMinor ?? '0'
  );
  // The viewer first, then everyone else in server order.
  const members = [
    ...balances.members.filter((member) => member.userId === currentUserId),
    ...balances.members.filter((member) => member.userId !== currentUserId)
  ];
  return members.length ? (
    <View>
      {members.map((member, index) => {
        const you = member.userId === currentUserId;
        return (
          <ListRow
            key={member.userId}
            divided={index > 0}
            leading={<Avatar name={member.displayName} />}
            title={you ? t('you') : member.displayName}
            trailing={
              <NetBalance
                netMinor={member.netMinor}
                currency={displayCurrency}
                member={!you}
              />
            }
          >
            {canRemind && own > 0n && !you && BigInt(member.netMinor) < 0n ? (
              <View className="items-start pt-1">
                <BalanceReminder
                  ledgerId={balances.ledgerId}
                  ledgerName={ledgerName}
                  member={member}
                />
              </View>
            ) : null}
          </ListRow>
        );
      })}
    </View>
  ) : (
    <Text selectable>{t('noRecordedBalance')}</Text>
  );
}
