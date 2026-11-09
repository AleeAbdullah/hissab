import type { DisplayCurrency } from '@/api/contracts';

const currencySymbols: Record<DisplayCurrency, string> = {
  AED: 'د.إ',
  EUR: '€',
  GBP: '£',
  PKR: 'Rs ',
  SAR: '﷼',
  USD: '$'
};

export function formatMinorAmount(
  minor: string,
  displayCurrency: DisplayCurrency
) {
  const amount = BigInt(minor);
  const digits = (amount < 0n ? -amount : amount).toString().padStart(3, '0');
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0n ? '−' : ''}${currencySymbols[displayCurrency]}${whole}.${digits.slice(-2)}`;
}

export function currencySymbol(displayCurrency: DisplayCurrency) {
  return currencySymbols[displayCurrency].trim();
}

export function absMinor(minor: bigint | string) {
  const amount = BigInt(minor);
  return (amount < 0n ? -amount : amount).toString();
}

// "12.34" or "12,34" -> "1234"; null when the text is not a two-decimal amount.
// Comma-locale decimal pads type ",", so accept it as the decimal separator.
export function parseMinorAmount(value: string) {
  const match = value.trim().match(/^(\d+)(?:[.,](\d{1,2}))?$/);
  if (!match) return null;
  const whole = BigInt(match[1]);
  const fraction = (match[2] ?? '').padEnd(2, '0');
  return (whole * 100n + BigInt(fraction || '0')).toString();
}

export function minorToInput(minor: string) {
  const digits = BigInt(minor).toString().padStart(3, '0');
  return `${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

export type AmountTone = 'positive' | 'negative' | 'neutral';

export function amountTone(minor: bigint | string): AmountTone {
  const amount = BigInt(minor);
  return amount > 0n ? 'positive' : amount < 0n ? 'negative' : 'neutral';
}

const toneClasses: Record<AmountTone, string> = {
  positive: 'text-positive',
  negative: 'text-destructive',
  neutral: 'text-foreground'
};

export function amountToneClass(minor: bigint | string) {
  return toneClasses[amountTone(minor)];
}
