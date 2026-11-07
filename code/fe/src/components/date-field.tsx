import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
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
  const primaryColor = useThemeVariable(THEME_VARIABLES.primary);
  const [picking, setPicking] = useState(false);
  const today = todayDate();
  const yesterday = shiftDate(today, -1);
  const label = dateLabel(value, today);
  return (
    <View className="gap-1.5">
      <Text className="text-[13px] text-muted-foreground">Date</Text>
      <Button
        variant="ghost"
        className={
          error
            ? 'min-h-12 w-full justify-start gap-3 rounded-xl border border-destructive bg-card px-3'
            : 'min-h-12 w-full justify-start gap-3 rounded-xl border border-input bg-card px-3'
        }
        accessibilityLabel={`Date, ${label}`}
        accessibilityHint="Opens the date picker"
        disabled={disabled}
        accessibilityState={{ disabled }}
        onPress={() => setPicking(true)}
      >
        <Icon as={CalendarDays} size={20} className="text-muted-foreground" />
        <Text className="min-w-0 flex-1 text-[17px] font-normal text-foreground">
          {label}
        </Text>
      </Button>
      <View className="flex-row flex-wrap gap-2">
        {[
          { label: 'Today', date: today },
          { label: 'Yesterday', date: yesterday }
        ].map((chip) => {
          const selected = value === chip.date;
          return (
            <Button
              key={chip.label}
              variant="ghost"
              size="compact"
              disabled={disabled}
              accessibilityLabel={chip.label}
              accessibilityState={{ selected, disabled }}
              className={
                selected
                  ? 'min-h-8 rounded-full border border-primary bg-accent px-3'
                  : 'min-h-8 rounded-full border border-border bg-card px-3'
              }
              onPress={() => onChange(chip.date)}
            >
              <Text
                className={
                  selected
                    ? 'text-[15px] font-semibold leading-5 text-primary'
                    : 'text-[15px] font-semibold leading-5 text-foreground'
                }
              >
                {chip.label}
              </Text>
            </Button>
          );
        })}
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
