import { QueryClientProvider } from '@tanstack/react-query';
import { PortalHost } from '@rn-primitives/portal';
import { ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { SessionProvider } from '@/features/auth/session';
import { LedgerDraftProvider } from '@/features/ledger/draft';
import { RealtimeProvider } from '@/features/realtime/provider';
import { useNavigationTheme } from '@/lib/theme';

import '../../global.css';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

function Navigation() {
  const colorScheme = useColorScheme();
  const navigationTheme = useNavigationTheme();
  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <View className="flex-1 bg-background">
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="home" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(shared)" />
          <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
        </Stack>
        <PortalHost />
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RealtimeProvider>
          <LedgerDraftProvider><Navigation /></LedgerDraftProvider>
        </RealtimeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
