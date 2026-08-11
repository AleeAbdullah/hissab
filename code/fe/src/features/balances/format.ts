import type { DisplayCurrency, UserBalances } from '@/api/contracts';

const symbols: Record<DisplayCurrency, string> = {
  AED: 'د.إ',
  EUR: '€',
  GBP: '£',
  PKR: 'Rs ',
  SAR: '﷼',
  USD: '$',
};

export function formatMinorAmount(minor: string, displayCurrency: DisplayCurrency) {
  const amount = BigInt(minor);
  const digits = (amount < 0n ? -amount : amount).toString().padStart(3, '0');
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0n ? '−' : ''}${symbols[displayCurrency]}${whole}.${digits.slice(-2)}`;
}

export function ownBalanceDescription(netMinor: string, displayCurrency: DisplayCurrency) {
  const amount = BigInt(netMinor);
  if (amount === 0n) return 'Settled';
  const formatted = formatMinorAmount(amount < 0n ? (-amount).toString() : netMinor, displayCurrency);
  return amount > 0n ? `You are owed ${formatted}` : `You owe ${formatted}`;
}

export function memberBalanceDescription(netMinor: string, displayCurrency: DisplayCurrency) {
  const amount = BigInt(netMinor);
  if (amount === 0n) return 'Settled';
  const formatted = formatMinorAmount(amount < 0n ? (-amount).toString() : netMinor, displayCurrency);
  return amount > 0n ? `Is owed ${formatted}` : `Owes ${formatted}`;
}

export function ledgerBalanceDescriptions(
  balances: UserBalances | undefined,
  ledgerId: string,
  displayCurrency: DisplayCurrency,
) {
  const ledger = balances?.ledgers.find((item) => item.ledgerId === ledgerId);
  return ledger ? [ownBalanceDescription(ledger.netMinor, displayCurrency)] : [];
}
