import { Stack } from 'expo-router/stack';

export default function ActivityLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Activity', headerLargeTitle: true }}
      />
      <Stack.Screen name="search" options={{ title: 'Filter activity' }} />
    </Stack>
  );
}
