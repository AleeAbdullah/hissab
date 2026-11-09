import Constants from 'expo-constants';

import type { AuthTokens } from './contracts';
import { errorMessage } from './error-message';
import { client } from './generated/client.gen';
import { authRefresh } from './generated/sdk.gen';
import { runSingleRefresh } from './refresh-lock';
import { clearTokens, getTokens, setTokens } from './session-store';

type Result = {
  data?: unknown;
  error?: unknown;
  response?: Response;
};

const localApiUrl = `http://${
  Constants.expoConfig?.hostUri?.replace(/:\d+$/, '') ??
  (process.env.EXPO_OS === 'android' ? '10.0.2.2' : '127.0.0.1')
}:3000`;
export const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? localApiUrl : '');

if (!apiBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required outside development.');
}

client.setConfig({
  baseUrl: apiBaseUrl,
  auth: () => getTokens()?.accessToken
});

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function idempotencyKey() {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `hissab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

export async function publicRequest<T>(
  call: () => Promise<Result>
): Promise<T> {
  return unwrap<T>(await call());
}

export async function request<T>(call: () => Promise<Result>): Promise<T> {
  const sentWith = getTokens()?.accessToken;
  let result = await call();
  if (result.response?.status === 401) {
    // A concurrent request may have rotated the session already; reuse its tokens
    // rather than refreshing again, which would invalidate them.
    const refresh =
      getTokens()?.accessToken !== sentWith ? 'ok' : await refreshSession();
    // An outage is not a rejected session: keep credentials and drafts.
    if (refresh === 'unavailable')
      throw new ApiError(
        'Tally Stick is unreachable right now. Check your connection and try again.'
      );
    if (refresh === 'rejected') {
      await clearTokens();
      return unwrap<T>(result);
    }
    const retriedWith = getTokens()?.accessToken;
    result = await call();
    // Sign out only if the tokens we just retried with are themselves rejected.
    if (
      result.response?.status === 401 &&
      getTokens()?.accessToken === retriedWith
    )
      await clearTokens();
  }
  return unwrap<T>(result);
}

function refreshSession() {
  return runSingleRefresh(doRefresh);
}

// One key per refresh token: a retry after a lost response replays the same
// rotation instead of tripping the server's token-reuse revocation.
let refreshAttempt: { token: string; key: string } | undefined;

async function doRefresh(): Promise<'ok' | 'rejected' | 'unavailable'> {
  const tokens = getTokens();
  if (!tokens) return 'rejected';

  if (refreshAttempt?.token !== tokens.refreshToken)
    refreshAttempt = { token: tokens.refreshToken, key: idempotencyKey() };
  let result: Result;
  try {
    result = await authRefresh({
      body: { refreshToken: tokens.refreshToken },
      headers: { 'Idempotency-Key': refreshAttempt.key }
    });
  } catch {
    return 'unavailable';
  }
  if (result.error || !result.data) {
    const status = result.response?.status;
    return status === 400 || status === 401 ? 'rejected' : 'unavailable';
  }
  await setTokens(result.data as AuthTokens);
  return 'ok';
}

function unwrap<T>(result: Result): T {
  if (result.error !== undefined) {
    throw new ApiError(
      errorMessage(result.error),
      result.response?.status,
      errorDetails(result.error)
    );
  }
  return result.data as T;
}

function errorDetails(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  const details = (error as Record<string, unknown>).details;
  return details && typeof details === 'object'
    ? (details as Record<string, unknown>)
    : undefined;
}
