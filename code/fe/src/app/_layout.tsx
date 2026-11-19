import '@/i18n';
import { PortalHost } from '@rn-primitives/portal';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, useColorScheme, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { DialogProvider } from '@/components/ui/dialog';
import { ProfileLocaleSync } from '@/features/account/components/profile-locale-sync';
import { canRegisterPushNotifications } from '@/features/account/push';
import { SessionProvider } from '@/features/auth/session';
import { LedgerDraftProvider } from '@/features/ledger/draft';
import { PersistedQueryProvider } from '@/features/local-data/query-cache';
import { RealtimeProvider } from '@/features/realtime/provider';
import { isRTL } from '@/i18n/locale';
import { useLargeText } from '@/lib/text-scale';
import { useNavigationTheme } from '@/lib/theme';

import '../../global.css';

export { AppErrorBoundary as ErrorBoundary } from '@/components/app-error-boundary';

const NotificationResponseHandler = lazy(
  () => import('@/features/account/components/notification-response-handler')
);

function Navigation() {
  const { t, i18n } = useTranslation('common');
  const colorScheme = useColorScheme();
  const navigationTheme = useNavigationTheme();
  const largeText = useLargeText();
  return (
    <ThemeProvider value={navigationTheme}>
      {canRegisterPushNotifications() ? (
        <Suspense fallback={null}>
          <NotificationResponseHandler />
        </Suspense>
      ) : null}
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <DialogProvider>
        <View
          className="flex-1 bg-background"
          style={{ direction: isRTL(i18n.language) ? 'rtl' : 'ltr' }}
        >
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(shared)" />
            <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
            <Stack.Screen
              name="group-new"
              options={{
                title: t('newGroup'),
                // Sheet header visibility is fixed when the sheet is presented, so it is set here.
                // react-native-screens attaches a native toolbar to iOS form sheets only.
                headerShown: Platform.OS === 'ios',
                headerTitleAlign: 'center',
                headerBackVisible: false,
                headerShadowVisible: false,
                presentation: 'formSheet',
                sheetAllowedDetents: [0.45, 1],
                sheetInitialDetentIndex: largeText ? 1 : 0,
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
                // Fixed at presentation; iOS form sheets alone get a native toolbar.
                headerShown: Platform.OS === 'ios',
                title: t('addExpense'),
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
          <ProfileLocaleSync />
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
