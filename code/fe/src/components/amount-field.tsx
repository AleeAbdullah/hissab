import type { RefObject } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  TextInput,
  View
} from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { formatMinorAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

export function currencySymbol(displayCurrency: DisplayCurrency) {
  return formatMinorAmount('0', displayCurrency)
    .replace(/0\.00$/, '')
    .trim();
}

// iOS number pads have no return key; inputs opt into this "Done" bar by its ID.
export const DONE_BAR_ID = 'decimal-done';

function DoneBar() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={DONE_BAR_ID}>
      <View className="flex-row justify-end border-t border-border bg-muted px-2">
        <Button variant="link" size="compact" onPress={Keyboard.dismiss}>
          <Text>Done</Text>
        </Button>
      </View>
    </InputAccessoryView>
  );
}

// Large centred amount entry shared by the personal and shared expense forms.
export function AmountField({
  displayCurrency,
  value,
  onChangeText,
  autoFocus,
  editable = true,
  error,
  inputRef
}: {
  displayCurrency: DisplayCurrency;
  value: string;
  onChangeText: (value: string) => void;
  autoFocus?: boolean;
  editable?: boolean;
  error?: string;
  inputRef?: RefObject<TextInput | null>;
}) {
  const textClass = 'text-[40px] font-semibold leading-[48px]';
  return (
    <View className="items-center gap-1.5">
      {/* Mounted before the input so an auto-focused field finds its bar. */}
      <DoneBar />
      <Text className="text-[13px] text-muted-foreground">Amount</Text>
      <View className="min-h-14 flex-row items-center justify-center gap-2 self-stretch">
        <Text
          className={cn(
            textClass,
            value ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {currencySymbol(displayCurrency)}
        </Text>
        <TextInput
          ref={inputRef}
          inputAccessoryViewID={DONE_BAR_ID}
          accessibilityLabel={`Amount in ${displayCurrency}`}
          autoFocus={autoFocus}
          editable={editable}
          keyboardType="decimal-pad"
          placeholder="0"
          value={value}
          onChangeText={onChangeText}
          className={cn(
            textClass,
            'min-w-6 shrink py-0 text-foreground placeholder:text-muted-foreground'
          )}
        />
      </View>
      {error ? (
        <Text
          selectable
          className="text-center text-[13px] leading-[18px] text-destructive"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
