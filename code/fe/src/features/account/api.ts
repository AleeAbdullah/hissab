import {
  authListSessions,
  authRevokeOtherSessions,
  authRevokeSession,
  usersGetProfile,
  usersUpdateProfile,
} from '@/api/generated/sdk.gen';
import type { UpdateProfileDto } from '@/api/generated/types.gen';
import type { Profile, Session } from '@/api/contracts';
import { idempotencyKey, request } from '@/api/transport';

export const profileQuery = {
  queryKey: ['profile'] as const,
  queryFn: () => request<Profile>(() => usersGetProfile()),
};

export const sessionsQuery = {
  queryKey: ['sessions'] as const,
  queryFn: () => request<Session[]>(() => authListSessions()),
};

export function updateProfile(body: UpdateProfileDto) {
  return request<Profile>(() =>
    usersUpdateProfile({ body, headers: { 'Idempotency-Key': idempotencyKey() } }),
  );
}

export function revokeSession(sessionId: string) {
  return request(() =>
    authRevokeSession({ path: { sessionId }, headers: { 'Idempotency-Key': idempotencyKey() } }),
  );
}

export function revokeOtherSessions() {
  return request(() =>
    authRevokeOtherSessions({ headers: { 'Idempotency-Key': idempotencyKey() } }),
  );
}
