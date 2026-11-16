import { Stack } from 'expo-router/stack';
import { Platform } from 'react-native';

import { useLargeText } from '@/lib/text-scale';

export default function GroupsLayout() {
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
          title: 'Groups',
          headerLargeTitle: true,
          headerTitleAlign: 'left'
        }}
      />
      <Stack.Screen name="[groupId]/index" options={{ title: 'Group' }} />
      <Stack.Screen
        name="[groupId]/balances"
        options={{ title: 'Group balances' }}
      />
      <Stack.Screen
        name="[groupId]/simplified-debts"
        options={{ title: 'Simplified debts' }}
      />
      <Stack.Screen name="[groupId]/members" options={{ title: 'Members' }} />
      <Stack.Screen
        name="[groupId]/invite"
        options={{
          title: 'Invite members',
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
        options={{ title: 'Group settings' }}
      />
      <Stack.Screen
        name="friends/index"
        options={{
          title: 'Friends',
          headerLargeTitle: true,
          headerTitleAlign: 'left'
        }}
      />
      <Stack.Screen
        name="friends/requests"
        options={{ title: 'Friend requests' }}
      />
      <Stack.Screen
        name="friends/blocked"
        options={{ title: 'Blocked people' }}
      />
      <Stack.Screen
        name="friends/[friendId]/index"
        options={{ title: 'Friend' }}
      />
      <Stack.Screen
        name="friends/[friendId]/settings"
        options={{ title: 'Friend settings' }}
      />
    </Stack>
  );
}
