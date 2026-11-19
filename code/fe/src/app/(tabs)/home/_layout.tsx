import { Stack } from 'expo-router/stack';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { InboxButton } from '@/features/account/components/inbox-button';
import { nativeLargeTitle } from '@/i18n';

export default function HomeLayout() {
  const { t } = useTranslation(['home', 'common']);
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('tallyStick'),
          headerRight: () => <InboxButton />,
          headerLargeTitle: Platform.OS === 'ios' && nativeLargeTitle,
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
            fontWeight: '400',
            fontSize: Platform.OS === 'ios' ? 20 : 24
          },
          headerLargeTitleStyle: {
            fontFamily: 'Georgia',
            fontWeight: '400',
            fontSize: 32
          }
        }}
      />
      <Stack.Screen
        name="inbox"
        options={{ title: t('inbox'), headerTitleAlign: 'center' }}
      />
    </Stack>
  );
}
