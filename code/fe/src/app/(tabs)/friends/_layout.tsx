import { Stack } from 'expo-router/stack';

import { useAppTheme } from '@/theme/use-app-theme';

export default function FriendsLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="index" options={{ title: 'Friends', headerLargeTitle: true }} />
      <Stack.Screen name="requests" options={{ title: 'Connection requests' }} />
      <Stack.Screen name="blocked" options={{ title: 'Blocked people' }} />
      <Stack.Screen name="[friendId]/index" options={{ title: 'Friend' }} />
      <Stack.Screen name="[friendId]/settings" options={{ title: 'Friend settings' }} />
    </Stack>
  );
}
