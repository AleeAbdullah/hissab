import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Screen } from '@/components/ui';
import { Text } from '@/components/ui/text';

export function ComingLaterScreen({ purpose }: { purpose: string }) {
  const { t } = useTranslation('common');
  return (
    <Screen>
      <View className="flex-1 justify-center gap-2 py-12">
        <Text selectable className="text-[32px] font-bold leading-[38px]">
          {t('comingLater')}
        </Text>
        <Text selectable className="leading-6 text-muted-foreground">
          {purpose}
        </Text>
      </View>
    </Screen>
  );
}
