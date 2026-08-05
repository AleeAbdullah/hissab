import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export function ChoiceChips({
  choices,
  value,
  onChange,
}: {
  choices: { label: string; value: string }[];
  value: string | null;
  onChange: (value: string) => void;
}) {
  const { colors } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {choices.map((choice) => {
        const selected = value === choice.value;
        return (
          <Pressable
            key={choice.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(choice.value)}
            style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12, borderWidth: 1, borderColor: selected ? colors.brand : colors.control, borderRadius: 12, borderCurve: 'continuous', backgroundColor: selected ? colors.brandSubtle : colors.surface }}
          >
            <Text selectable style={{ color: selected ? colors.brand : colors.text, fontSize: 15, fontWeight: selected ? '600' : '400' }}>{choice.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
