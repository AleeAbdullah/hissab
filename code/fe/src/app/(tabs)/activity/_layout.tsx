import { Stack } from 'expo-router/stack';
import { useTranslation } from 'react-i18next';

import { nativeLargeTitle } from '@/i18n';

export default function ActivityLayout() {
  const { t } = useTranslation(['activity', 'common']);
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: t('activity'), headerLargeTitle: nativeLargeTitle }}
      />
    </Stack>
  );
}
