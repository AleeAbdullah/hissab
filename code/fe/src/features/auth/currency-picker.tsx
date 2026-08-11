import { View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option,
} from '@/components/ui/select';

import { AuthField } from './components/auth-field';

const displayCurrencies: DisplayCurrency[] = ['PKR', 'USD', 'GBP', 'EUR', 'AED', 'SAR'];

export function CurrencyPicker({ value, onChange, first }: { value?: DisplayCurrency; onChange: (value: DisplayCurrency) => void; first?: boolean }) {
  const selected = value ? { value, label: value } : undefined;
  const change = (option: Option) => {
    if (option) onChange(option.value as DisplayCurrency);
  };

  return (
    <AuthField first={first} label="Display currency">
      <View>
        <Select value={selected} onValueChange={change}>
          <SelectTrigger accessibilityLabel="Choose display currency" className="w-full border-0 px-0">
            <SelectValue placeholder="Choose a currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {displayCurrencies.map((code) => <SelectItem key={code} label={code} value={code}>{code}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </View>
    </AuthField>
  );
}
