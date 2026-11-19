import type { ErrorBoundaryProps } from 'expo-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('common');
  const clearDrafts = failedRetries > 0;
  return (
    <SafeAreaView className="flex-1 justify-center gap-4 bg-background p-5">
      <Text accessibilityRole="header" className="text-2xl font-semibold">
        {t('crashTitle')}
      </Text>
      <Text className="text-base text-muted-foreground">
        {clearDrafts
          ? t('crashAgain')
          : t('crashBody')}
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
        <Text>{clearDrafts ? t('clearDraftsRetry') : t('tryAgain')}</Text>
      </Button>
    </SafeAreaView>
  );
}
