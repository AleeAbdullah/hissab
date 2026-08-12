import type { DisplayCurrency, LedgerBalances } from '@/api/contracts';
import { Card, Notice, Row } from '@/components/ui';

import { memberBalanceDescription } from '@/features/balances/format';

export function LedgerBalanceCards({
  balances,
  displayCurrency
}: {
  balances: LedgerBalances;
  displayCurrency: DisplayCurrency;
}) {
  if (!balances.members.length) {
    return (
      <Notice title="No recorded balance">
        No shared expenses or settlements have created balances in this ledger
        yet.
      </Notice>
    );
  }

  return (
    <Card>
      {balances.members.map((member) => (
        <Row
          key={member.userId}
          title={member.displayName}
          detail={memberBalanceDescription(member.netMinor, displayCurrency)}
        />
      ))}
    </Card>
  );
}
