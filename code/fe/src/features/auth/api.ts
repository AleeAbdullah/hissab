import * as Device from 'expo-device';

import type { AuthTokens } from '@/api/contracts';
import {
  authChangePassword,
  authForgotPassword,
  authRegister,
  authResetPassword,
  authSignIn,
  authSignOut
} from '@/api/generated/sdk.gen';
import type { RegisterDto, SignInDto } from '@/api/generated/types.gen';
import { queryClient } from '@/api/query-client';
import {
  clearTokens,
  getSessionUserId,
  setTokens
} from '@/api/session-store';
import { idempotencyKey, publicRequest, request } from '@/api/transport';
import {
  forgetPushDevice,
  revokePushNotifications
} from '@/features/account/push';

const deviceName = Device.deviceName ?? Device.modelName ?? undefined;

export async function register(body: Omit<RegisterDto, 'deviceName'>) {
  const tokens = await publicRequest<AuthTokens>(() =>
    authRegister({
      body: { ...body, deviceName },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
  queryClient.clear();
  await setTokens(tokens);
}

export async function signIn(body: Omit<SignInDto, 'deviceName'>) {
  const tokens = await publicRequest<AuthTokens>(() =>
    authSignIn({
      body: { ...body, deviceName },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
  queryClient.clear();
  await setTokens(tokens);
}

export async function signOut() {
  const userId = getSessionUserId();
  // Best effort: stop push for this account before the session ends.
  if (userId) await revokePushNotifications(userId).catch(() => undefined);
  try {
    await request(() =>
      authSignOut({ headers: { 'Idempotency-Key': idempotencyKey() } })
    );
  } finally {
    queryClient.clear();
    await clearTokens();
  }
}

export function forgotPassword(email: string) {
  return publicRequest(() =>
    authForgotPassword({
      body: { email },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}

export function resetPassword(token: string, newPassword: string) {
  return publicRequest(() =>
    authResetPassword({
      body: { token, newPassword },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
) {
  const userId = getSessionUserId();
  await request(() =>
    authChangePassword({
      body: { currentPassword, newPassword },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
  if (userId) await forgetPushDevice(userId).catch(() => undefined);
  queryClient.clear();
  await clearTokens();
}
