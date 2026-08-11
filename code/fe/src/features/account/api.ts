import {
  accountDeleteAccount,
  accountExportAccount,
  authListSessions,
  authRevokeOtherSessions,
  authRevokeSession,
  notificationsGetNotificationPreferences,
  notificationsListNotifications,
  notificationsMarkAllNotificationsRead,
  notificationsMarkNotificationRead,
  notificationsRegisterNotificationDevice,
  notificationsRevokeNotificationDevice,
  notificationsUpdateNotificationPreferences,
  usersGetProfile,
  usersUpdateProfile,
} from '@/api/generated/sdk.gen';
import type {
  AccountExportDto,
  DeleteAccountDtoWritable,
  RegisterNotificationDeviceDto,
  UpdateNotificationPreferencesDto,
  UpdateProfileDto,
} from '@/api/generated/types.gen';
import type { AccountDeletionResult, InAppNotification, NotificationDevice, NotificationPage, NotificationPreferences, Profile, Session } from '@/api/contracts';
import { idempotencyKey, request } from '@/api/transport';

export const profileQuery = {
  queryKey: ['profile'] as const,
  queryFn: () => request<Profile>(() => usersGetProfile()),
};

export const sessionsQuery = {
  queryKey: ['sessions'] as const,
  queryFn: () => request<Session[]>(() => authListSessions()),
};

export const notificationPreferencesQuery = {
  queryKey: ['notification-preferences'] as const,
  queryFn: () => request<NotificationPreferences>(() => notificationsGetNotificationPreferences()),
};

export const notificationInboxQueryKey = ['notifications'] as const;

export function notificationInboxInfiniteQuery() {
  return {
    queryKey: notificationInboxQueryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }: { pageParam: string | undefined }) =>
      request<NotificationPage>(() => notificationsListNotifications({ query: { cursor: pageParam, limit: 50 } })),
    getNextPageParam: (page: NotificationPage) => page.nextCursor ?? undefined,
  };
}

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

export function updateNotificationPreferences(body: UpdateNotificationPreferencesDto) {
  return request<NotificationPreferences>(() =>
    notificationsUpdateNotificationPreferences({ body, headers: { 'Idempotency-Key': idempotencyKey() } }),
  );
}

export function registerNotificationDevice(body: RegisterNotificationDeviceDto) {
  return request<NotificationDevice>(() =>
    notificationsRegisterNotificationDevice({ body, headers: { 'Idempotency-Key': idempotencyKey() } }),
  );
}

export function revokeNotificationDevice(deviceId: string) {
  return request<NotificationDevice>(() =>
    notificationsRevokeNotificationDevice({ path: { deviceId }, headers: { 'Idempotency-Key': idempotencyKey() } }),
  );
}

export function markNotificationRead(notificationId: string) {
  return request<InAppNotification>(() =>
    notificationsMarkNotificationRead({ path: { notificationId }, headers: { 'Idempotency-Key': idempotencyKey() } }),
  );
}

export function markAllNotificationsRead() {
  return request(() =>
    notificationsMarkAllNotificationsRead({ headers: { 'Idempotency-Key': idempotencyKey() } }),
  );
}

export function exportAccount() {
  return request<AccountExportDto>(() => accountExportAccount());
}

export function deleteAccount(body: DeleteAccountDtoWritable) {
  return request<AccountDeletionResult>(() =>
    accountDeleteAccount({ body, headers: { 'Idempotency-Key': idempotencyKey() } }),
  );
}
