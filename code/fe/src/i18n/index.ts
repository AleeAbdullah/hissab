import './polyfills';

import { reloadAppAsync } from 'expo';
import { File, Paths } from 'expo-file-system';
import { getLocales } from 'expo-localization';
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import {
  intlTag,
  isLocale,
  isRTL,
  matchDeviceLocale,
  type Locale
} from './locale';
import { resources } from './resources';

type Stored = {
  locale?: string;
  // The device (or iOS per-app) language seen at the last launch.
  device?: string;
  // A device-language change not yet saved to the server profile.
  deviceSync?: string;
  directionReload?: string;
};
const preference = new File(Paths.document, 'hissab-language.json');
function readStored(): Stored {
  try {
    const stored = JSON.parse(preference.textSync());
    return stored?.version === 1 ? stored : {};
  } catch {
    return {};
  }
}
function writeStored(patch: Stored) {
  // Read before create: an overwriting create empties the file.
  const next = JSON.stringify({ ...readStored(), ...patch, version: 1 });
  preference.create({ overwrite: true, intermediates: true });
  preference.write(next);
}
function readPreference(): Locale | null {
  const { locale: stored } = readStored();
  const locale = stored === 'en-PK' ? 'en' : stored;
  return isLocale(locale) ? locale : null;
}
const matchedDevice = matchDeviceLocale(
  getLocales().map((value) => value.languageTag)
);
const currentDevice = matchedDevice ?? 'en';
// Changing the phone language, or the app's Language in iOS Settings, restarts
// the app. A change to a supported device language since the last launch is an
// explicit choice, so it replaces the saved one and is sent to the profile
// later. A change to an unsupported language keeps the saved one.
const lastDevice = readStored().device;
const seenDevice = matchedDevice ?? 'none';
const deviceChanged =
  typeof lastDevice === 'string' &&
  matchedDevice !== null &&
  lastDevice !== matchedDevice;
// Decided before writing, so a failed write cannot lose the saved language.
const savedLocale = deviceChanged ? currentDevice : readPreference();
if (lastDevice !== seenDevice) {
  try {
    writeStored(
      deviceChanged
        ? {
            locale: currentDevice,
            device: currentDevice,
            deviceSync: currentDevice
          }
        : { device: seenDevice }
    );
  } catch {}
}
const initialLocale = savedLocale ?? currentDevice;
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
  clearDeviceSync();
  if (locale === activeLocale()) return;
  const rtl = isRTL(locale);
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  await i18n.changeLanguage(locale);
  if (directionChanged) await reloadAppAsync();
}

// Remote preferences must not restart a screen containing unsaved edits.
// A pending device-language change outranks the older server value.
export async function syncLocale(locale: Locale) {
  if (pendingDeviceLocale()) return;
  persistLocale(locale);
}

export function pendingDeviceLocale(): Locale | null {
  const { deviceSync } = readStored();
  return isLocale(deviceSync) ? deviceSync : null;
}

export function clearDeviceSync() {
  if (readStored().deviceSync === undefined) return;
  writeStored({ deviceSync: undefined });
}

function persistLocale(locale: Locale) {
  if (!isLocale(locale)) throw new Error('Unsupported locale');
  if (readPreference() === locale) return;
  writeStored({ locale });
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
      writeStored({ directionReload: initialLocale });
      void reloadAppAsync().catch(() => undefined);
    } catch {
      // Without a saved marker, restarting could loop on every launch.
    }
  }
}
