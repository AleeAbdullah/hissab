import { Stack } from 'expo-router/stack';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Home', headerLargeTitle: true }}
      />
    </Stack>
  );
}
