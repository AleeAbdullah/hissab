import type { DisplayCurrency } from '@/api/contracts';
import { intlLocale } from '@/i18n';

const currencySymbols: Record<DisplayCurrency, string> = {
  AED: 'د.إ',
  EUR: '€',
  GBP: '£',
  PKR: 'Rs ',
  SAR: '﷼',
  USD: '$'
};

// The locale's currency layout (grouping, separators, symbol and sign
// position), sampled once per locale/currency/sign. The BigInt digits are then
// placed into it, so amounts never pass through floating point.
const patterns = new Map<string, Intl.NumberFormatPart[]>();
const wholeFormatters = new Map<string, Intl.NumberFormat>();
function samplePattern(
  locale: string,
  currency: DisplayCurrency,
  negative: boolean
) {
  const key = `${locale}|${currency}|${negative}`;
  let parts = patterns.get(key);
  if (!parts) {
    parts = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).formatToParts(negative ? -123456789.12 : 123456789.12);
    patterns.set(key, parts);
  }
  return parts;
}

export function formatMinorAmount(
  minor: string,
  displayCurrency: DisplayCurrency
) {
  const amount = BigInt(minor);
  const digits = (amount < 0n ? -amount : amount).toString().padStart(3, '0');
  const locale = intlLocale();
  const sample = samplePattern(locale, displayCurrency, amount < 0n);
  let wholeFormatter = wholeFormatters.get(locale);
  if (!wholeFormatter) {
    wholeFormatter = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0
    });
    wholeFormatters.set(locale, wholeFormatter);
  }
  const number =
    wholeFormatter.format(BigInt(digits.slice(0, -2))) +
    (sample.find((part) => part.type === 'decimal')?.value ?? '.') +
    digits.slice(-2);
  let inserted = false;
  return sample
    .map((part) => {
      if (['integer', 'group', 'decimal', 'fraction'].includes(part.type)) {
        if (inserted) return '';
        inserted = true;
        return number;
      }
      if (part.type === 'currency')
        return currencySymbols[displayCurrency].trim();
      return part.value;
    })
    .join('');
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
  const match = value
    .replace(/[٠-٩۰-۹]/g, (digit) =>
      String(digit.charCodeAt(0) - (digit >= '۰' ? 0x06f0 : 0x0660))
    )
    .replace(/[٫،]/g, '.')
    .trim()
    .match(/^(\d+)(?:[.,](\d{1,2}))?$/);
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
