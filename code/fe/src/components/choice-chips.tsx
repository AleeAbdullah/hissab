import { useId } from 'react';
import { View } from 'react-native';

import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export function ChoiceChips({
  choices,
  value,
  onChange
}: {
  choices: { label: string; value: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  const groupId = useId();
  return (
    <RadioGroup
      value={value ?? undefined}
      onValueChange={onChange}
      className="flex-row flex-wrap gap-3"
    >
      {choices.map((choice) => (
        <View
          key={choice.value}
          className="min-h-12 flex-row items-center gap-2"
        >
          <RadioGroupItem
            id={`${groupId}-${choice.value}`}
            value={choice.value}
          />
          <Label htmlFor={`${groupId}-${choice.value}`} className="text-[15px]">
            {choice.label}
          </Label>
        </View>
      ))}
    </RadioGroup>
  );
}
