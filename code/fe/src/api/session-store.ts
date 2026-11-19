import * as SecureStore from 'expo-secure-store';

import type { AuthTokens } from './contracts';
import { clearLocalUserData } from '@/features/local-data/store';
import { setLocale } from '@/i18n';
import { isLocale } from '@/i18n/locale';

const KEY = 'hissab.auth.tokens';
let current: AuthTokens | null | undefined;
let loginVersion = 0;
let storageWrite = Promise.resolve();
const listeners = new Set<() => void>();

function publish() {
  listeners.forEach((listener) => listener());
}

export function getTokens() {
  return current;
}

export function getLoginVersion() {
  return loginVersion;
}

function persistTokens(tokens: AuthTokens | null, version: number) {
  const write = storageWrite.then(async () => {
    if (tokens && version !== loginVersion) return false;
    if (tokens) await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
    else await SecureStore.deleteItemAsync(KEY);
    return version === loginVersion;
  });
  storageWrite = write.then(
    () => undefined,
    () => undefined
  );
  return write;
}

async function syncSessionLocale() {
  const locale = current?.user.locale;
  if (isLocale(locale)) {
    await setLocale(locale).catch(() => undefined);
  }
}

export async function hydrateTokens() {
  const version = loginVersion;
  try {
    const value = await SecureStore.getItemAsync(KEY);
    if (version !== loginVersion) return;
    current = value ? (JSON.parse(value) as AuthTokens) : null;
  } catch {
    if (version !== loginVersion) return;
    current = null;
  }
  // The separate language preference may be newer than this token snapshot.
  publish();
}

export async function setTokens(tokens: AuthTokens, version: number) {
  // Persist first so a killed app never loses a rotated refresh token.
  if (!(await persistTokens(tokens, version)) || version !== loginVersion)
    return false;
  const previousUserId = getSessionUserId(current);
  const background = current?.user.id === tokens.user.id;
  current = tokens;
  const nextUserId = getSessionUserId(tokens);
  if (previousUserId && previousUserId !== nextUserId)
    clearLocalUserData(previousUserId);
  // Refresh responses can replay an older preference; fresh profile reads own sync.
  if (!background) await syncSessionLocale();
  if (version !== loginVersion) return false;
  publish();
  return true;
}

export async function clearTokens() {
  const version = ++loginVersion;
  const userId = getSessionUserId(current);
  current = null;
  publish();
  if (userId) clearLocalUserData(userId);
  await persistTokens(null, version);
  return version;
}

export function subscribeTokens(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSessionUserId(tokens = current) {
  if (!tokens) return null;
  try {
    const [, payload] = tokens.accessToken.split('.');
    if (!payload) return null;
    const base64 = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const { sub } = JSON.parse(atob(base64)) as { sub?: unknown };
    return typeof sub === 'string' ? sub : null;
  } catch {
    return null;
  }
}
