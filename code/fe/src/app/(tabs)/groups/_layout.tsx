import { Stack } from 'expo-router/stack';

export default function GroupsLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Groups', headerLargeTitle: true }} />
      <Stack.Screen name="[groupId]/index" options={{ title: 'Group' }} />
      <Stack.Screen name="[groupId]/edit" options={{ title: 'Edit group' }} />
      <Stack.Screen name="[groupId]/balances" options={{ title: 'Group balances' }} />
      <Stack.Screen name="[groupId]/simplified-debts" options={{ title: 'Simplified debts' }} />
      <Stack.Screen name="[groupId]/members" options={{ title: 'Members' }} />
      <Stack.Screen name="[groupId]/settings" options={{ title: 'Group settings' }} />
    </Stack>
  );
}
