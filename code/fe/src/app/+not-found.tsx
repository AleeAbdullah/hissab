import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Not found' }} />
      <Text selectable className="text-xl font-semibold">
        This screen does not exist.
      </Text>
      <Link href="/" asChild>
        <Button role="link">
          <Text>Go home</Text>
        </Button>
      </Link>
    </Screen>
  );
}
