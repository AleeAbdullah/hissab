export const LOCALES = [
  'en',
  'ur-Latn-PK',
  'ur-PK',
  'ar',
  'es',
  'fr',
  'hi',
  'zh-Hans',
] as const;

export type Locale = (typeof LOCALES)[number];

export function resolveLocale(value: unknown): Locale {
  return LOCALES.find((locale) => locale === value) ?? 'en';
}
