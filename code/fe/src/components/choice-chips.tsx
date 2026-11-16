import { View } from 'react-native';

import { Chip } from '@/components/ui';

// Single choice from a short list, drawn with the shared Chip.
export function ChoiceChips({
  choices,
  value,
  onChange
}: {
  choices: { label: string; value: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" className="flex-row flex-wrap gap-2">
      {choices.map((choice) => (
        <Chip
          key={choice.value}
          label={choice.label}
          selected={choice.value === value}
          onPress={() => onChange(choice.value)}
        />
      ))}
    </View>
  );
}
