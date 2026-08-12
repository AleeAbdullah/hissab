import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { registerNotificationDevice, revokeNotificationDevice } from './api';

const installationKey = 'hissab.push.installation';
const deviceKey = (userId: string) => `hissab.push.device.${userId}`;

export function canRegisterPushNotifications() {
  return (
    Device.isDevice && (Platform.OS === 'ios' || Platform.OS === 'android')
  );
}

export async function registerForPushNotifications(userId: string) {
  if (!canRegisterPushNotifications()) {
    throw new Error(
      'Push registration requires a physical iOS or Android device.'
    );
  }

  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted
    ? current
    : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      'Allow notifications in your device settings to turn on push notifications.'
    );
  }

  const token = await Notifications.getExpoPushTokenAsync();
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
