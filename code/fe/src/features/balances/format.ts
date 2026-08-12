import type { DisplayCurrency, UserBalances } from '@/api/contracts';
import { formatMinorAmount } from '@/lib/utils';

export function ownBalanceDescription(
  netMinor: string,
  displayCurrency: DisplayCurrency
) {
  const amount = BigInt(netMinor);
  if (amount === 0n) return 'Settled';
  const formatted = formatMinorAmount(
    amount < 0n ? (-amount).toString() : netMinor,
    displayCurrency
  );
  return amount > 0n ? `You are owed ${formatted}` : `You owe ${formatted}`;
}

export function memberBalanceDescription(
  netMinor: string,
  displayCurrency: DisplayCurrency
) {
  const amount = BigInt(netMinor);
  if (amount === 0n) return 'Settled';
  const formatted = formatMinorAmount(
    amount < 0n ? (-amount).toString() : netMinor,
    displayCurrency
  );
  return amount > 0n ? `Is owed ${formatted}` : `Owes ${formatted}`;
}

export function ledgerBalanceDescriptions(
  balances: UserBalances | undefined,
  ledgerId: string,
  displayCurrency: DisplayCurrency
) {
  const ledger = balances?.ledgers.find((item) => item.ledgerId === ledgerId);
  return ledger
    ? [ownBalanceDescription(ledger.netMinor, displayCurrency)]
    : [];
}
