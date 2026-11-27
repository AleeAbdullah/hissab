import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { registerNotificationDevice, revokeNotificationDevice } from './api';
import { i18n } from '@/i18n';

const installationKey = 'hissab.push.installation';
const deviceKey = (userId: string) => `hissab.push.device.${userId}`;
const projectId =
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;

export function canRegisterPushNotifications() {
  return (
    Device.isDevice &&
    Constants.executionEnvironment !== ExecutionEnvironment.StoreClient &&
    (Platform.OS === 'ios' || Platform.OS === 'android') &&
    typeof projectId === 'string' &&
    projectId.length > 0
  );
}

export async function registerForPushNotifications(userId: string) {
  if (!canRegisterPushNotifications()) {
    throw new Error(
      i18n.t('account:pushNotificationsRequireATallyStickBuildLinkedTo')
    );
  }

  // Load only after push is enabled; importing this at startup crashes Expo Go.
  const Notifications = await import('expo-notifications');
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: i18n.t('account:tallyStickNotifications'),
      importance: Notifications.AndroidImportance.DEFAULT
    });
  }
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      i18n.t('account:allowNotificationsInYourDeviceSettingsToTurnOn')
    );
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const device = await registerNotificationDevice({
    token: token.data,
    platform: Platform.OS === 'ios' ? 'IOS' : 'ANDROID',
    deviceId: await getInstallationId()
  });
  await SecureStore.setItemAsync(deviceKey(userId), device.id);
}

export async function hasRegisteredPushDevice(userId: string) {
  return Boolean(await SecureStore.getItemAsync(deviceKey(userId)));
}

// Whether this installation holds a server device registration for the user.
// The server's pushEnabled preference alone does not mean this phone receives pushes.
export const pushDeviceQuery = (userId: string) => ({
  queryKey: ['push-device', userId] as const,
  queryFn: () => hasRegisteredPushDevice(userId)
});

const offeredKey = (userId: string) => `hissab.push.offered.${userId}`;

// The in-app "turn on notifications" prompt is shown once per user and installation.
export async function claimPushOffer(userId: string) {
  if (await SecureStore.getItemAsync(offeredKey(userId))) return false;
  await SecureStore.setItemAsync(offeredKey(userId), '1');
  return true;
}

// The server already disabled this device (e.g. password change); drop the local record.
export function forgetPushDevice(userId: string) {
  return SecureStore.deleteItemAsync(deviceKey(userId));
}

export async function revokePushNotifications(userId: string) {
  const deviceId = await SecureStore.getItemAsync(deviceKey(userId));
  if (!deviceId) return;
  await revokeNotificationDevice(deviceId);
  await SecureStore.deleteItemAsync(deviceKey(userId));
}

async function getInstallationId() {
  const existing = await SecureStore.getItemAsync(installationKey);
  if (existing) return existing;
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `hissab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  await SecureStore.setItemAsync(installationKey, id);
  return id;
}
