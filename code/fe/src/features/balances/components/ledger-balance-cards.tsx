import type { LedgerBalances } from '@/api/contracts';
import { Card, Notice, Row, SectionLabel } from '@/components/ui';
import { View } from 'react-native';

import { memberBalanceDescription } from '@/features/balances/format';

export function LedgerBalanceCards({ balances }: { balances: LedgerBalances }) {
  if (!balances.currencies.length) {
    return <Notice title="No recorded balance">No shared expenses or settlements have created balances in this ledger yet.</Notice>;
  }

  return (
    <View style={{ gap: 12 }}>
      {balances.currencies.map(({ currency, members }) => (
        <View key={currency} style={{ gap: 8 }}>
          <SectionLabel>{currency}</SectionLabel>
          <Card>
            {members.map((member) => (
              <Row
                key={member.userId}
                title={member.displayName}
                detail={memberBalanceDescription(member.netMinor, currency)}
              />
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}
