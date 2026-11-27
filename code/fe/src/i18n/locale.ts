export const locales = [
  'en',
  'ur-Latn-PK',
  'ur-PK',
  'ar',
  'es',
  'fr',
  'hi',
  'zh-Hans'
] as const;
export type Locale = (typeof locales)[number];
export const languageNames: Record<Locale, string> = {
  en: 'English',
  'ur-Latn-PK': 'Roman Urdu',
  'ur-PK': 'اردو',
  ar: 'العربية',
  es: 'Español',
  fr: 'Français',
  hi: 'हिन्दी',
  'zh-Hans': '简体中文'
};
export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}
// The first device language Tally Stick supports, or null when there is none.
export function matchDeviceLocale(tags: string[]): Locale | null {
  for (const tag of tags) {
    const lower = tag.toLowerCase();
    if (lower.startsWith('ur-latn')) continue;
    const language = lower.split('-')[0];
    if (language === 'ur') return 'ur-PK';
    if (language === 'zh') {
      if (lower.includes('-hans')) return 'zh-Hans';
      if (lower.includes('-hant') || /-(tw|hk|mo)\b/.test(lower)) continue;
      return 'zh-Hans';
    }
    if (isLocale(language)) return language;
  }
  return null;
}
export const deviceLocale = (tags: string[]): Locale =>
  matchDeviceLocale(tags) ?? 'en';
export const isRTL = (locale: string) => locale === 'ur-PK' || locale === 'ar';
// React Native accepts physical alignment values only.
export function logicalTextAlign(edge: 'start' | 'end', locale: string) {
  if (edge === 'start') return isRTL(locale) ? 'right' : 'left';
  return isRTL(locale) ? 'left' : 'right';
}
// Intl has no Roman Urdu date data and otherwise falls back to Urdu script.
export const intlTag = (locale: string) =>
  `${locale === 'ur-Latn-PK' ? 'en-PK' : locale}-u-nu-latn-ca-gregory`;
