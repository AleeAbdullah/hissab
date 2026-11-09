import type { ErrorBoundaryProps } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getSessionUserId, getTokens } from '@/api/session-store';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { discardPersistedQueries } from '@/features/local-data/query-cache';
import { clearLocalUserData } from '@/features/local-data/store';

// Counts retries across remounts: a crash that survives a cache reset may come
// from a malformed local draft, so the next retry clears drafts too.
let failedRetries = 0;

// Rendered by Expo Router outside the root providers, so it uses only plain primitives.
export function AppErrorBoundary({ retry }: ErrorBoundaryProps) {
  const clearDrafts = failedRetries > 0;
  return (
    <SafeAreaView className="flex-1 justify-center gap-4 bg-background p-5">
      <Text accessibilityRole="header" className="text-2xl font-semibold">
        Something went wrong
      </Text>
      <Text className="text-base text-muted-foreground">
        {clearDrafts
          ? 'The problem happened again. Clearing unsaved drafts on this device may fix it. Your saved records are safe.'
          : 'Tally Stick hit an unexpected problem. Your records are safe. Try again to reload the app.'}
      </Text>
      <Button
        onPress={() => {
          failedRetries += 1;
          discardPersistedQueries();
          const userId = getSessionUserId(getTokens());
          if (clearDrafts && userId) clearLocalUserData(userId);
          void retry();
        }}
      >
        <Text>{clearDrafts ? 'Clear drafts and try again' : 'Try again'}</Text>
      </Button>
    </SafeAreaView>
  );
}
