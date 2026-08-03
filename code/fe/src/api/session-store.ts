import * as SecureStore from 'expo-secure-store';

import type { AuthTokens } from './contracts';

const KEY = 'hissab.auth.tokens';
let current: AuthTokens | null | undefined;
const listeners = new Set<() => void>();

function publish() {
  listeners.forEach((listener) => listener());
}

export function getTokens() {
  return current;
}

export async function hydrateTokens() {
  try {
    const value = await SecureStore.getItemAsync(KEY);
    current = value ? (JSON.parse(value) as AuthTokens) : null;
  } catch {
    current = null;
  }
  publish();
}

export async function setTokens(tokens: AuthTokens) {
  current = tokens;
  publish();
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
}

export async function clearTokens() {
  current = null;
  publish();
  await SecureStore.deleteItemAsync(KEY);
}

export function subscribeTokens(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
