import { client } from './generated/client.gen';
import { authRefresh } from './generated/sdk.gen';
import { errorMessage } from './error-message';
import { runSingleRefresh } from './refresh-lock';
import { clearTokens, getTokens, setTokens } from './session-store';
import type { AuthTokens } from './contracts';

type Result = {
  data?: unknown;
  error?: unknown;
  response?: Response;
};

const localApiUrl =
  process.env.EXPO_OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://127.0.0.1:3000';
export const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? localApiUrl : '');

if (!apiBaseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required outside development.');
}

client.setConfig({
  baseUrl: apiBaseUrl,
  auth: () => getTokens()?.accessToken,
});

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly details?: Record<string, unknown>,
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

export async function publicRequest<T>(call: () => Promise<Result>): Promise<T> {
  return unwrap<T>(await call());
}

export async function request<T>(call: () => Promise<Result>): Promise<T> {
  let result = await call();
  if (result.response?.status === 401 && (await refreshSession())) {
    result = await call();
  }
  if (result.response?.status === 401) {
    await clearTokens();
  }
  return unwrap<T>(result);
}

function refreshSession() {
  return runSingleRefresh(doRefresh);
}

async function doRefresh() {
  const tokens = getTokens();
  if (!tokens) return false;

  const result = await authRefresh({
    body: { refreshToken: tokens.refreshToken },
    headers: { 'Idempotency-Key': idempotencyKey() },
  });
  if (result.error || !result.data) return false;
  await setTokens(result.data as AuthTokens);
  return true;
}

function unwrap<T>(result: Result): T {
  if (result.error !== undefined) {
    throw new ApiError(errorMessage(result.error), result.response?.status, errorDetails(result.error));
  }
  return result.data as T;
}

function errorDetails(error: unknown) {
  if (!error || typeof error !== 'object') return undefined;
  const details = (error as Record<string, unknown>).details;
  return details && typeof details === 'object' ? details as Record<string, unknown> : undefined;
}
