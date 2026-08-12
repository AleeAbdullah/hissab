import * as SecureStore from 'expo-secure-store';

import type { AuthTokens } from './contracts';
import { clearLocalUserData } from '@/features/local-data/store';

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
  const previousUserId = getSessionUserId(current);
  current = tokens;
  const nextUserId = getSessionUserId(tokens);
  if (previousUserId && previousUserId !== nextUserId)
    clearLocalUserData(previousUserId);
  publish();
  await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
}

export async function clearTokens() {
  const userId = getSessionUserId(current);
  current = null;
  publish();
  if (userId) clearLocalUserData(userId);
  await SecureStore.deleteItemAsync(KEY);
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
