import { Stack } from 'expo-router/stack';
import { useTranslation } from 'react-i18next';

import { nativeLargeTitle } from '@/i18n';

export default function PersonalLayout() {
  const { t } = useTranslation(['personal', 'common']);
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('personal'),
          headerLargeTitle: nativeLargeTitle,
          headerTitleAlign: 'left'
        }}
      />
      <Stack.Screen name="transactions" options={{ title: t('history') }} />
      <Stack.Screen
        name="spending"
        options={{ title: t('spending'), headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="[transactionId]/index"
        options={{ title: t('transaction') }}
      />
      <Stack.Screen
        name="[transactionId]/edit"
        options={{ title: t('editTransaction') }}
      />
    </Stack>
  );
}
