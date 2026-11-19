import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Chip } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { intlLocale, isolate } from '@/i18n';
import {
  dateLabel,
  localDateKey,
  localPickerDate,
  shiftDate,
  todayDate
} from '@/lib/dates';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

export function DateField({
  error,
  disabled = false,
  allowFuture = false,
  onChange,
  value
}: {
  error?: string;
  disabled?: boolean;
  allowFuture?: boolean;
  onChange: (value: string) => void;
  value: string;
}) {
  const { t } = useTranslation('common');
  const primaryColor = useThemeVariable(THEME_VARIABLES.primary);
  const [picking, setPicking] = useState(false);
  const today = todayDate();
  const yesterday = shiftDate(today, -1);
  const label = dateLabel(value, today);
  const custom = value !== today && value !== yesterday;
  const chips = [
    {
      label: t('today'),
      selected: value === today,
      onPress: () => onChange(today)
    },
    {
      label: t('yesterday'),
      selected: value === yesterday,
      onPress: () => onChange(yesterday)
    },
    {
      label: custom ? dateLabel(value, today) : t('pickDate'),
      selected: custom,
      icon: true,
      onPress: () => setPicking(true)
    }
  ];
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] text-muted-foreground">{t('date')}</Text>
      <View className="flex-row flex-wrap gap-2">
        {chips.map((chip) => (
          <Chip
            key={chip.icon ? 'pick' : chip.label}
            label={chip.label}
            selected={chip.selected}
            icon={chip.icon ? CalendarDays : undefined}
            error={Boolean(error)}
            disabled={disabled}
            accessibilityLabel={
              chip.icon ? t('dateLabel', { date: isolate(label) }) : chip.label
            }
            accessibilityHint={chip.icon ? t('opensDate') : undefined}
            onPress={chip.onPress}
          />
        ))}
      </View>
      {error ? (
        <Text
          selectable
          className="text-[13px] leading-[18px] text-destructive"
        >
          {error}
        </Text>
      ) : null}
      {picking ? (
        <DateTimePicker
          mode="date"
          locale={intlLocale()}
          positiveButton={{ label: t('done') }}
          negativeButton={{ label: t('cancel') }}
          presentation="dialog"
          value={localPickerDate(value)}
          accentColor={primaryColor}
          maximumDate={allowFuture ? undefined : localPickerDate(today)}
          onValueChange={(_, date) => {
            if (!disabled) onChange(localDateKey(date));
            setPicking(false);
          }}
          onDismiss={() => setPicking(false)}
        />
      ) : null}
    </View>
  );
}
