export const SUPPORTED_CURRENCIES = [
  'PKR',
  'USD',
  'GBP',
  'EUR',
  'AED',
  'SAR',
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];
