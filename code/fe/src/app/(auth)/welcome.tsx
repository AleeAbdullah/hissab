import { Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useAppTheme } from '@/theme/theme';

const points = [
  ['Split what you actually paid', 'One payer or several. Equal or exact amounts, down to the cent.'],
  ['Balances stay per currency', 'USD and PKR are never added together into one number.'],
  ['Record settlements made elsewhere', 'Cash, bank transfer, anything. Hissab keeps the record.'],
];

export default function WelcomeScreen() {
  const { colors } = useAppTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'space-between', gap: 32, paddingTop: 32 }}>
        <View style={{ gap: 28 }}>
          <View style={{ gap: 16 }}>
            <Text selectable style={{ color: colors.text, fontFamily: 'serif', fontSize: 56, lineHeight: 60, fontWeight: '500' }}>Hissab</Text>
            <View style={{ width: 48, height: 1, backgroundColor: colors.brand }} />
            <View style={{ gap: 8 }}>
              <Text selectable style={{ color: colors.brand, fontSize: 10, lineHeight: 14, fontWeight: '700', letterSpacing: 1.8 }}>
                CALM LEDGER. CLEAR RELATIONSHIPS.
              </Text>
              <Text selectable style={{ color: colors.text, fontFamily: 'serif', fontSize: 32, lineHeight: 38, fontWeight: '500' }}>
                Keep the record clear.
              </Text>
              <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>
                Shared expenses, and exactly who owes whom.
              </Text>
            </View>
          </View>
          <View style={{ gap: 20 }}>
            {points.map(([title, detail]) => (
              <View key={title} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                <View style={{ width: 26, height: 26, borderWidth: 1, borderColor: colors.divider, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: 10, height: 2, backgroundColor: colors.brand }} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>{title}</Text>
                  <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>{detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Button title="Create account" href="/register" />
          <Button title="Sign in" href="/sign-in" secondary />
          <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16, textAlign: 'center' }}>
            Hissab records money that has already moved. It never transfers funds, links a bank account, or touches a card.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
