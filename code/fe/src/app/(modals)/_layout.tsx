import { Stack } from 'expo-router/stack';

export default function ModalLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="connection-new"
        options={{
          title: 'Add connection',
          presentation: 'formSheet',
          sheetGrabberVisible: true
        }}
      />
      <Stack.Screen name="shared-expense" options={{ title: 'Add expense' }} />
      <Stack.Screen name="receipt" options={{ title: 'Receipt' }} />
      <Stack.Screen
        name="settlement"
        options={{ title: 'Record settlement' }}
      />
    </Stack>
  );
}
