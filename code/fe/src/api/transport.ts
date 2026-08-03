import { client } from './generated/client.gen';
import { authRefresh } from './generated/sdk.gen';
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
const baseUrl = process.env.EXPO_PUBLIC_API_URL ?? (__DEV__ ? localApiUrl : '');

if (!baseUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is required outside development.');
}

client.setConfig({
  baseUrl,
  auth: () => getTokens()?.accessToken,
});

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
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
    throw new ApiError(errorMessage(result.error), result.response?.status);
  }
  return result.data as T;
}

function errorMessage(error: unknown) {
  if (typeof error === 'string' && error) return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join('\n');
    if (typeof message === 'string') return message;
  }
  return 'Something went wrong. Check your connection and try again.';
}
