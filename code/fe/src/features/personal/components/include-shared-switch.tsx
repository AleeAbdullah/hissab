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
  const controlColor = useThemeVariable(THEME_VARIABLES.input);
  const primaryColor = useThemeVariable(THEME_VARIABLES.primary);
  const thumbColor = useThemeVariable(THEME_VARIABLES.card);
  return (
    <View className="min-h-12 flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-base">Include shared expenses</Text>
        <Text className="text-[13px] leading-[18px] text-muted-foreground">
          Counts only your share of each shared expense.
        </Text>
      </View>
      <Switch
        accessibilityLabel="Include shared expenses"
        accessibilityHint="Counts only your share of each shared expense."
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: controlColor, true: primaryColor }}
        thumbColor={thumbColor}
      />
    </View>
  );
}
