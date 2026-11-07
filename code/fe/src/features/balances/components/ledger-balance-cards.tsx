import { View } from 'react-native';

import type { DisplayCurrency, LedgerBalances } from '@/api/contracts';
import { Card, Row } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { BalanceReminder } from '@/features/balances/components/balance-reminder';
import { memberBalanceDescription } from '@/features/balances/format';

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
  const own = BigInt(
    balances.members.find((member) => member.userId === currentUserId)
      ?.netMinor ?? '0'
  );
  return balances.members.length ? (
    <Card>
      {balances.members.map((member) => (
        <View key={member.userId}>
          <Row
            title={member.displayName}
            detail={memberBalanceDescription(member.netMinor, displayCurrency)}
          />
          {canRemind &&
          own > 0n &&
          member.userId !== currentUserId &&
          BigInt(member.netMinor) < 0n ? (
            <View className="px-3 pb-3">
              <BalanceReminder
                ledgerId={balances.ledgerId}
                ledgerName={ledgerName}
                member={member}
              />
            </View>
          ) : null}
        </View>
      ))}
    </Card>
  ) : (
    <Text selectable>No recorded balance.</Text>
  );
}
