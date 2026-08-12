import type { DisplayCurrency } from '@/api/contracts';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

const currencySymbols: Record<DisplayCurrency, string> = {
  AED: 'د.إ',
  EUR: '€',
  GBP: '£',
  PKR: 'Rs ',
  SAR: '﷼',
  USD: '$'
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMinorAmount(
  minor: string,
  displayCurrency: DisplayCurrency
) {
  const amount = BigInt(minor);
  const digits = (amount < 0n ? -amount : amount).toString().padStart(3, '0');
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount < 0n ? '−' : ''}${currencySymbols[displayCurrency]}${whole}.${digits.slice(-2)}`;
}
