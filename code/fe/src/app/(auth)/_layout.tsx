import { Stack } from 'expo-router/stack';

import { Text } from '@/components/ui/text';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: () => (
          <Text
            selectable
            className="font-serif text-[21px] font-medium leading-6"
          >
            Hissab
          </Text>
        ),
        headerTitleAlign: 'center',
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      <Stack.Screen
        name="forgot-password"
        options={{ title: 'Reset password' }}
      />
      <Stack.Screen
        name="reset-password"
        options={{ title: 'Set new password' }}
      />
    </Stack>
  );
}
