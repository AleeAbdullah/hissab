import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['account', 'common']);
  const selected = value ? { value, label: value } : undefined;
  const change = (option: Option) => {
    if (option) onChange(option.value as DisplayCurrency);
  };

  return (
    <View className="gap-1.5">
      <Text selectable className="text-[13px] text-muted-foreground">
        {t('displayCurrency')}
      </Text>
      <Select value={selected} onValueChange={change}>
        <SelectTrigger
          accessibilityLabel={t('displayCurrency')}
          className="w-full"
        >
          <SelectValue placeholder={t('chooseACurrency')} />
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
