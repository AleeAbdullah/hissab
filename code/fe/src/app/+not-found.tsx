import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function NotFoundScreen() {
  const { t } = useTranslation('common');
  return (
    <Screen>
      <Stack.Screen options={{ title: t('notFound') }} />
      <Text selectable className="text-xl font-semibold">
        {t('screenMissing')}
      </Text>
      <Link href="/" asChild>
        <Button role="link">
          <Text>{t('goHome')}</Text>
        </Button>
      </Link>
    </Screen>
  );
}
