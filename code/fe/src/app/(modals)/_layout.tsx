import { Stack } from 'expo-router/stack';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

export default function ModalLayout() {
  const { t } = useTranslation(['common', 'settlements']);
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center'
      }}
    >
      <Stack.Screen
        name="connection-new"
        options={{
          title: t('addFriend'),
          // Fixed at presentation; iOS form sheets alone get a native toolbar.
          headerShown: Platform.OS === 'ios',
          presentation: 'formSheet',
          sheetGrabberVisible: true
        }}
      />
      <Stack.Screen name="shared-expense" options={{ title: t('addExpense') }} />
      <Stack.Screen name="receipt" options={{ title: t('receipt') }} />
      <Stack.Screen name="report" options={{ title: t('report') }} />
      <Stack.Screen
        name="settlement"
        options={{ title: t('settlements:recordPayment') }}
      />
    </Stack>
  );
}
