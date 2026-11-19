import { Stack } from 'expo-router/stack';
import { useTranslation } from 'react-i18next';

import { nativeLargeTitle } from '@/i18n';

export default function AccountLayout() {
  const { t } = useTranslation(['account', 'common']);
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('account'),
          headerLargeTitle: nativeLargeTitle,
          headerTitleAlign: 'left'
        }}
      />
      <Stack.Screen name="profile" options={{ title: t('profile') }} />
      <Stack.Screen
        name="change-password"
        options={{ title: t('changePassword') }}
      />
      <Stack.Screen
        name="sessions"
        options={{ title: t('devicesAndSessions') }}
      />
      <Stack.Screen
        name="notifications"
        options={{ title: t('notifications') }}
      />
      <Stack.Screen
        name="blocked-people"
        options={{ title: t('blockedPeople') }}
      />
      <Stack.Screen
        name="delete-account"
        options={{ title: t('deleteAccount') }}
      />
    </Stack>
  );
}
