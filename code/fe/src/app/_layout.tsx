import { QueryClientProvider } from '@tanstack/react-query';
import { PortalHost } from '@rn-primitives/portal';
import { ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { DialogProvider } from '@/components/ui/dialog';
import { SessionProvider } from '@/features/auth/session';
import { LedgerDraftProvider } from '@/features/ledger/draft';
import { PersistedQueryProvider } from '@/features/local-data/query-cache';
import { RealtimeProvider } from '@/features/realtime/provider';
import { useNavigationTheme } from '@/lib/theme';

import '../../global.css';

// TODO: Restore push setup and tap handling when switching to a development build.
// Expo Go cannot load expo-notifications on Android.
/*
import { router } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { markNotificationRead } from '@/features/account/api';
import { useSession } from '@/features/auth/session';
import { reminderLedgerHref } from '@/features/reminders/navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});
*/

function Navigation() {
  const colorScheme = useColorScheme();
  const navigationTheme = useNavigationTheme();
  return (
    <ThemeProvider value={navigationTheme}>
      {/* TODO: Restore in a development build: <NotificationResponseHandler /> */}
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
                title: 'Create group',
                headerShown: true,
                headerTitleAlign: 'center',
                headerBackVisible: false,
                headerShadowVisible: false,
                presentation: 'formSheet',
                sheetAllowedDetents: [0.5, 1],
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

/* TODO: Restore notification-tap handling in a development build.
function NotificationResponseHandler() {
  const response = Notifications.useLastNotificationResponse();
  const session = useSession();
  const handledResponseId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!response) {
      handledResponseId.current = undefined;
      return;
    }
    if (!session) return;
    const responseId = response.notification.request.identifier;
    if (handledResponseId.current === responseId) return;
    handledResponseId.current = responseId;
    const data = response.notification.request.content.data ?? {};
    if (data.recipientUserId !== session.user.id) {
      void Notifications.clearLastNotificationResponseAsync();
      return;
    }
    const href = reminderLedgerHref(data);
    if (href) {
      router.push(href);
      const notificationId = data.notificationId;
      if (typeof notificationId === 'string')
        void markNotificationRead(notificationId).finally(() =>
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        );
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [response, session]);

  return null;
}
*/

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
