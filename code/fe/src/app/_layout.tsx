import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';

import { queryClient } from '@/api/query-client';
import { SessionProvider } from '@/features/auth/session';
import { AppTheme, useAppTheme } from '@/theme/theme';

import '../../global.css';

function Navigation() {
  const { dark } = useAppTheme();
  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
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
        <AppTheme>
          <Navigation />
        </AppTheme>
      </SessionProvider>
    </QueryClientProvider>
  );
}
