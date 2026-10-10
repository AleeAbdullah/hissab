import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { todayDate } from '@/features/expenses/form';
import { dateLabel, shiftDate } from '@/features/personal/form';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function pickerDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

export function TransactionDateField({
  error,
  onChange,
  value
}: {
  error?: string;
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
              hitSlop={8}
              accessibilityLabel={chip.label}
              accessibilityState={{ selected }}
              className={
                selected
                  ? 'min-h-8 rounded-full border border-primary bg-accent px-3 py-1'
                  : 'min-h-8 rounded-full border border-border bg-card px-3 py-1'
              }
              onPress={() => onChange(chip.date)}
            >
              <Text
                className={
                  selected
                    ? 'text-[13px] font-semibold leading-[18px] text-primary'
                    : 'text-[13px] font-normal leading-[18px] text-foreground'
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
          value={pickerDate(value)}
          accentColor={primaryColor}
          maximumDate={pickerDate(today)}
          onValueChange={(_, date) => {
            onChange(dateKey(date));
            setPicking(false);
          }}
          onDismiss={() => setPicking(false)}
        />
      ) : null}
    </View>
  );
}
