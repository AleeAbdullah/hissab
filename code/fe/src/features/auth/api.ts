import * as Device from 'expo-device';

import { queryClient } from '@/api/query-client';
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
import { clearTokens, setTokens } from '@/api/session-store';
import { idempotencyKey, publicRequest, request } from '@/api/transport';

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
  await request(() =>
    authChangePassword({
      body: { currentPassword, newPassword },
      headers: { 'Idempotency-Key': idempotencyKey() }
    })
  );
  queryClient.clear();
  await clearTokens();
}
