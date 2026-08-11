import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router/stack';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';

import { queryClient } from '@/api/query-client';
import { SessionProvider } from '@/features/auth/session';
import { LedgerDraftProvider } from '@/features/ledger/draft';
import { RealtimeProvider } from '@/features/realtime/provider';
import { AppTheme, useAppTheme } from '@/theme/theme';

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
  const { dark } = useAppTheme();
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="home" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(shared)" />
        <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <RealtimeProvider>
          <AppTheme>
            <LedgerDraftProvider><Navigation /></LedgerDraftProvider>
          </AppTheme>
        </RealtimeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
