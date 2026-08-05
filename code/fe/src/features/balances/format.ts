import type { SupportedCurrency, UserBalances } from '@/api/contracts';

export function formatMinorAmount(minor: string, currency: SupportedCurrency) {
  const amount = BigInt(minor);
  const digits = (amount < 0n ? -amount : amount).toString().padStart(3, '0');
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency} ${whole}.${digits.slice(-2)}`;
}

export function ownBalanceDescription(netMinor: string, currency: SupportedCurrency) {
  const amount = BigInt(netMinor);
  if (amount === 0n) return `${currency} settled`;
  const formatted = formatMinorAmount(netMinor, currency);
  return amount > 0n ? `You are owed ${formatted}` : `You owe ${formatted}`;
}

export function memberBalanceDescription(netMinor: string, currency: SupportedCurrency) {
  const amount = BigInt(netMinor);
  if (amount === 0n) return `${currency} settled`;
  const formatted = formatMinorAmount(netMinor, currency);
  return amount > 0n ? `Is owed ${formatted}` : `Owes ${formatted}`;
}

export function ledgerBalanceDescriptions(balances: UserBalances | undefined, ledgerId: string) {
  return (balances?.currencies ?? []).flatMap(({ currency, ledgers }) => {
    const ledger = ledgers.find((item) => item.ledgerId === ledgerId);
    return ledger ? [ownBalanceDescription(ledger.netMinor, currency)] : [];
  });
}
