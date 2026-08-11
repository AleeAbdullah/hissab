import { Stack } from 'expo-router/stack';

export default function AccountLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Account', headerLargeTitle: true }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="change-password" options={{ title: 'Change password' }} />
      <Stack.Screen name="sessions" options={{ title: 'Devices and sessions' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="export" options={{ title: 'Export your data' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete account' }} />
    </Stack>
  );
}
