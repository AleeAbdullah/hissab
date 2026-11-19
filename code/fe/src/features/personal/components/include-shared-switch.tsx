import { useTranslation } from 'react-i18next';
import { Switch, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

export function IncludeSharedSwitch({
  value,
  onValueChange
}: {
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const { t } = useTranslation(['personal', 'common']);
  const controlColor = useThemeVariable(THEME_VARIABLES.input);
  const primaryColor = useThemeVariable(THEME_VARIABLES.primary);
  const thumbColor = useThemeVariable(THEME_VARIABLES.card);
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base">{t('includeSharedExpenses')}</Text>
        <Text className="text-[13px] leading-[18px] text-muted-foreground">
          {t('countsOnlyYourShareOfEachSharedExpense')}
        </Text>
      </View>
      <Switch
        accessibilityLabel={t('includeSharedExpenses')}
        accessibilityHint={t('countsOnlyYourShareOfEachSharedExpense')}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: controlColor, true: primaryColor }}
        thumbColor={thumbColor}
      />
    </View>
  );
}
