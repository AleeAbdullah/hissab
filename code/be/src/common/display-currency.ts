export const DISPLAY_CURRENCIES = [
  'PKR',
  'USD',
  'GBP',
  'EUR',
  'AED',
  'SAR',
] as const;

export type DisplayCurrency = (typeof DISPLAY_CURRENCIES)[number];
