import * as Device from 'expo-device';
import { getLocales } from 'expo-localization';

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
  getLoginVersion,
  getSessionUserId,
  setTokens
} from '@/api/session-store';
import {
  ApiError,
  idempotencyKey,
  publicRequest,
  request
} from '@/api/transport';
import {
  forgetPushDevice,
  revokePushNotifications
} from '@/features/account/push';
import { i18n } from '@/i18n';
import { deviceLocale } from '@/i18n/locale';

const deviceName = Device.deviceName ?? Device.modelName ?? undefined;

export async function register(body: Omit<RegisterDto, 'deviceName'>) {
  const loginVersion = await clearTokens();
  if (getLoginVersion() !== loginVersion)
    throw new ApiError(i18n.t('common:apiErrors.sessionChanged'));
  const tokens = await publicRequest<AuthTokens>(() =>
    authRegister({
      body: {
        ...body,
        deviceName,
        locale:
          body.locale ??
          deviceLocale(getLocales().map((value) => value.languageTag))
      },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
  if (getLoginVersion() !== loginVersion)
    throw new ApiError(i18n.t('common:apiErrors.sessionChanged'));
  queryClient.clear();
  if (!(await setTokens(tokens, loginVersion)))
    throw new ApiError(i18n.t('common:apiErrors.sessionChanged'));
}

export async function signIn(body: Omit<SignInDto, 'deviceName'>) {
  const loginVersion = await clearTokens();
  if (getLoginVersion() !== loginVersion)
    throw new ApiError(i18n.t('common:apiErrors.sessionChanged'));
  const tokens = await publicRequest<AuthTokens>(() =>
    authSignIn({
      body: { ...body, deviceName },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
  if (getLoginVersion() !== loginVersion)
    throw new ApiError(i18n.t('common:apiErrors.sessionChanged'));
  queryClient.clear();
  if (!(await setTokens(tokens, loginVersion)))
    throw new ApiError(i18n.t('common:apiErrors.sessionChanged'));
}

export async function signOut() {
  const loginVersion = getLoginVersion();
  const userId = getSessionUserId();
  // Best effort: stop push for this account before the session ends.
  if (userId) await revokePushNotifications(userId).catch(() => undefined);
  try {
    if (getLoginVersion() !== loginVersion) return;
    await request(() =>
      authSignOut({ headers: { 'Idempotency-Key': idempotencyKey() } })
    );
  } finally {
    if (getLoginVersion() === loginVersion) {
      queryClient.clear();
      await clearTokens();
    }
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
  const loginVersion = getLoginVersion();
  const userId = getSessionUserId();
  await request(() =>
    authChangePassword({
      body: { currentPassword, newPassword },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
  if (userId) await forgetPushDevice(userId).catch(() => undefined);
  if (getLoginVersion() !== loginVersion) return;
  queryClient.clear();
  await clearTokens();
}
