import { Stack } from 'expo-router/stack';

export default function PersonalLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Personal', headerLargeTitle: true }}
      />
      <Stack.Screen name="transactions" options={{ title: 'History' }} />
      <Stack.Screen
        name="spending"
        options={{ title: 'Spending', headerTitleAlign: 'center' }}
      />
      <Stack.Screen
        name="[transactionId]/index"
        options={{ title: 'Transaction' }}
      />
      <Stack.Screen
        name="[transactionId]/edit"
        options={{ title: 'Edit transaction' }}
      />
    </Stack>
  );
}
