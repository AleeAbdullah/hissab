import { Stack } from 'expo-router/stack';
import { Text } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useAppTheme } from '@/theme/use-app-theme';

export default function NotFoundScreen() {
  const { colors } = useAppTheme();
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>This screen does not exist.</Text>
      <Button title="Go home" href="/" />
    </Screen>
  );
}
