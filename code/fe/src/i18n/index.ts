import './polyfills';

import { reloadAppAsync } from 'expo';
import { File, Paths } from 'expo-file-system';
import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import { deviceLocale, intlTag, isLocale, isRTL, type Locale } from './locale';
import { resources } from './resources';

const preference = new File(Paths.document, 'hissab-language.json');
function readPreference(): Locale | null {
  try {
    const stored = JSON.parse(preference.textSync());
    const locale = stored.locale === 'en-PK' ? 'en' : stored.locale;
    return stored.version === 1 && isLocale(locale) ? locale : null;
  } catch {
    return null;
  }
}
const savedLocale = readPreference();
const initialLocale =
  savedLocale ?? deviceLocale(getLocales().map((value) => value.languageTag));
export const i18n = i18next;
void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  defaultNS: 'common',
  fallbackLng: {
    'ur-Latn-PK': ['en'],
    'ur-PK': ['en'],
    en: [],
    ar: ['en'],
    es: ['en'],
    fr: ['en'],
    hi: ['en'],
    'zh-Hans': ['en'],
    default: ['en']
  },
  load: 'currentOnly',
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false }
});
export const activeLocale = () => i18n.language as Locale;
export const intlLocale = () => intlTag(activeLocale());
// iOS draws native large titles mirrored in right-to-left layouts, so RTL
// locales use the standard inline title. Native direction is fixed per launch.
export const nativeLargeTitle = !I18nManager.isRTL;
export const isolate = (value: string) =>
  isRTL(activeLocale()) ? `\u2068${value}\u2069` : value;

// Explicit Settings changes may restart after their confirmation.
export async function setLocale(locale: Locale) {
  const directionChanged = isRTL(locale) !== isRTL(activeLocale());
  persistLocale(locale);
  if (locale === activeLocale()) return;
  const rtl = isRTL(locale);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  await i18n.changeLanguage(locale);
  if (directionChanged) await reloadAppAsync();
}

// Remote preferences must not restart a screen containing unsaved edits.
export async function syncLocale(locale: Locale) {
  persistLocale(locale);
}

function persistLocale(locale: Locale) {
  if (!isLocale(locale)) throw new Error('Unsupported locale');
  if (readPreference() === locale) return;
  preference.create({ overwrite: true, intermediates: true });
  preference.write(JSON.stringify({ version: 1, locale }));
}
// Native direction only applies after a restart. If it disagrees with the
// selected locale (first launch, device language change), reload once per
// locale; the marker stops a failed native update from looping.
I18nManager.allowRTL(isRTL(initialLocale));
I18nManager.forceRTL(isRTL(initialLocale));
if (I18nManager.isRTL !== isRTL(initialLocale)) {
  let marker: unknown;
  try {
    marker = JSON.parse(preference.textSync()).directionReload;
  } catch {}
  if (marker !== initialLocale) {
    try {
      preference.create({ overwrite: true, intermediates: true });
      preference.write(
        JSON.stringify({
          version: 1,
          locale: savedLocale ?? undefined,
          directionReload: initialLocale
        })
      );
      void reloadAppAsync().catch(() => undefined);
    } catch {
      // Without a saved marker, restarting could loop on every launch.
    }
  }
}
