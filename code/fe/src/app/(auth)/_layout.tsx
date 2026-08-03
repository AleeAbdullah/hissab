import { Stack } from 'expo-router/stack';
import { Text } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export default function AuthLayout() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerTitle: () => <Text selectable style={{ color: colors.text, fontFamily: 'serif', fontSize: 21, lineHeight: 24, fontWeight: '500' }}>Hissab</Text>,
        headerTitleAlign: 'center',
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.canvas },
      }}
    >
      <Stack.Screen name="welcome" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Set new password' }} />
    </Stack>
  );
}
