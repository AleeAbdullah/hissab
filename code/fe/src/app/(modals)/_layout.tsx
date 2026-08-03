import { Stack } from 'expo-router/stack';

import { useAppTheme } from '@/theme/use-app-theme';

export default function ModalLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', contentStyle: { backgroundColor: colors.canvas } }}>
      <Stack.Screen name="connection-new" options={{ title: 'Add connection', presentation: 'formSheet', sheetGrabberVisible: true }} />
      <Stack.Screen name="group-new" options={{ title: 'Create group' }} />
      <Stack.Screen name="members-select" options={{ title: 'Select members' }} />
      <Stack.Screen name="shared-expense" options={{ title: 'Add expense' }} />
      <Stack.Screen name="payers" options={{ title: 'Payers' }} />
      <Stack.Screen name="split" options={{ title: 'Split' }} />
      <Stack.Screen name="ledger-picker" options={{ title: 'Choose ledger' }} />
      <Stack.Screen name="currency-picker" options={{ title: 'Choose currency' }} />
      <Stack.Screen name="category-picker" options={{ title: 'Choose category' }} />
      <Stack.Screen name="receipt" options={{ title: 'Receipt' }} />
      <Stack.Screen name="settlement" options={{ title: 'Record settlement' }} />
      <Stack.Screen name="reminder" options={{ title: 'Send reminder' }} />
      <Stack.Screen name="personal-transaction" options={{ title: 'Add transaction' }} />
      <Stack.Screen name="report-mode" options={{ title: 'Report mode' }} />
    </Stack>
  );
}
