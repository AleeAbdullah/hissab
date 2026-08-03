import { Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useAppTheme } from '@/theme/theme';

const points = [
  ['Know what is settled', 'Balances stay grouped by currency, never silently converted.'],
  ['Share the full record', 'Expenses, payments and changes remain visible to everyone involved.'],
  ['Keep personal spending too', 'Private records stay separate from shared ledgers.'],
];

export default function WelcomeScreen() {
  const { colors } = useAppTheme();
  return (
    <Screen>
      <View style={{ gap: 28, paddingTop: 52 }}>
        <View style={{ gap: 6 }}>
          <Text selectable style={{ color: colors.text, fontSize: 34, lineHeight: 41, fontWeight: '700' }}>Hissab</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 20, lineHeight: 25 }}>Shared expenses, and exactly who owes whom.</Text>
        </View>
        <View style={{ gap: 20 }}>
          {points.map(([title, detail], index) => (
            <View key={title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
              <View style={{ width: 26, height: 26, borderRadius: 8, borderCurve: 'continuous', backgroundColor: colors.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.brand, fontWeight: '700' }}>{index + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text selectable style={{ color: colors.text, fontSize: 17, lineHeight: 23, fontWeight: '600' }}>{title}</Text>
                <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 20 }}>{detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
      <View style={{ gap: 10 }}>
        <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18, textAlign: 'center' }}>Hissab records money. It does not hold or transfer funds.</Text>
        <Button title="Create account" href="/register" />
        <Button title="Sign in" href="/sign-in" secondary />
      </View>
    </Screen>
  );
}
