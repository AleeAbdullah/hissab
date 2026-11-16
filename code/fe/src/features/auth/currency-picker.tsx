import { View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';

const displayCurrencies: DisplayCurrency[] = [
  'PKR',
  'USD',
  'GBP',
  'EUR',
  'AED',
  'SAR'
];

export function CurrencyPicker({
  value,
  onChange
}: {
  value?: DisplayCurrency;
  onChange: (value: DisplayCurrency) => void;
}) {
  const selected = value ? { value, label: value } : undefined;
  const change = (option: Option) => {
    if (option) onChange(option.value as DisplayCurrency);
  };

  return (
    <View className="gap-1.5">
      <Text selectable className="text-[13px] text-muted-foreground">
        Display currency
      </Text>
      <Select value={selected} onValueChange={change}>
        <SelectTrigger accessibilityLabel="Display currency" className="w-full">
          <SelectValue placeholder="Choose a currency" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {displayCurrencies.map((code) => (
              <SelectItem key={code} label={code} value={code}>
                {code}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </View>
  );
}
