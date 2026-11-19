import { Stack } from 'expo-router/stack';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { nativeLargeTitle } from '@/i18n';
import { useLargeText } from '@/lib/text-scale';

export default function GroupsLayout() {
  const { t } = useTranslation(['groups', 'common']);
  const largeText = useLargeText();
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
          title: t('groups'),
          headerLargeTitle: nativeLargeTitle,
          headerTitleAlign: 'left'
        }}
      />
      <Stack.Screen name="[groupId]/index" options={{ title: t('group') }} />
      <Stack.Screen
        name="[groupId]/balances"
        options={{ title: t('groupBalances') }}
      />
      <Stack.Screen
        name="[groupId]/simplified-debts"
        options={{ title: t('simplifiedDebts') }}
      />
      <Stack.Screen
        name="[groupId]/members"
        options={{ title: t('members') }}
      />
      <Stack.Screen
        name="[groupId]/invite"
        options={{
          title: t('inviteMembers'),
          // Sheet header visibility is fixed when the sheet is presented, so it is set here.
          // react-native-screens attaches a native toolbar to iOS form sheets only.
          headerShown: Platform.OS === 'ios',
          headerTitleAlign: 'center',
          presentation: 'formSheet',
          sheetAllowedDetents: [0.65, 1],
          sheetInitialDetentIndex: largeText ? 1 : 0,
          sheetGrabberVisible: true,
          sheetCornerRadius: 20
        }}
      />
      <Stack.Screen
        name="[groupId]/settings"
        options={{ title: t('groupSettings') }}
      />
      <Stack.Screen
        name="friends/index"
        options={{
          title: t('friends'),
          headerLargeTitle: nativeLargeTitle,
          headerTitleAlign: 'left'
        }}
      />
      <Stack.Screen
        name="friends/requests"
        options={{ title: t('friendRequests') }}
      />
      <Stack.Screen
        name="friends/blocked"
        options={{ title: t('blockedPeople') }}
      />
      <Stack.Screen
        name="friends/[friendId]/index"
        options={{ title: t('friend') }}
      />
      <Stack.Screen
        name="friends/[friendId]/settings"
        options={{ title: t('friendSettings') }}
      />
    </Stack>
  );
}
