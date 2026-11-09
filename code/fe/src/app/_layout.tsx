import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { lazy, Suspense } from 'react';
import { useColorScheme, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { DialogProvider } from '@/components/ui/dialog';
import { canRegisterPushNotifications } from '@/features/account/push';
import { SessionProvider } from '@/features/auth/session';
import { LedgerDraftProvider } from '@/features/ledger/draft';
import { PersistedQueryProvider } from '@/features/local-data/query-cache';
import { RealtimeProvider } from '@/features/realtime/provider';
import { useNavigationTheme } from '@/lib/theme';

import '../../global.css';

export { AppErrorBoundary as ErrorBoundary } from '@/components/app-error-boundary';

const NotificationResponseHandler = lazy(
  () => import('@/features/account/components/notification-response-handler')
);

function Navigation() {
  const colorScheme = useColorScheme();
  const navigationTheme = useNavigationTheme();
  return (
    <ThemeProvider value={navigationTheme}>
      {canRegisterPushNotifications() ? (
        <Suspense fallback={null}>
          <NotificationResponseHandler />
        </Suspense>
      ) : null}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <DialogProvider>
        <View className="flex-1 bg-background">
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(shared)" />
            <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="group-new"
              options={{
                title: 'New group',
                headerShown: true,
                headerTitleAlign: 'center',
                headerBackVisible: false,
                headerShadowVisible: false,
                presentation: 'formSheet',
                sheetAllowedDetents: 'fitToContents',
                sheetGrabberVisible: true,
                sheetCornerRadius: 20,
                contentStyle: {
                  backgroundColor: navigationTheme.colors.background
                }
              }}
            />
            <Stack.Screen
              name="personal-transaction"
              options={{
                presentation: 'formSheet',
                sheetAllowedDetents: [0.85, 1],
                sheetGrabberVisible: true,
                sheetCornerRadius: 20
              }}
            />
          </Stack>
          <PortalHost />
        </View>
      </DialogProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <PersistedQueryProvider>
          <RealtimeProvider>
            <LedgerDraftProvider>
              <Navigation />
            </LedgerDraftProvider>
          </RealtimeProvider>
        </PersistedQueryProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
