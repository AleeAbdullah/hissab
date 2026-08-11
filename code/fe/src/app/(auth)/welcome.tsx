import { Link } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

const points = [
  ['Split what you actually paid', 'One payer or several. Equal or exact amounts, down to the cent.'],
  ['Balances stay clear', 'Every shared expense and payment updates one exact ledger balance.'],
  ['Record settlements made elsewhere', 'Cash, bank transfer, anything. Hissab keeps the record.'],
];

export default function WelcomeScreen() {
  return (
    <Screen>
      <View className="flex-1 justify-between gap-8 pt-8">
        <View className="gap-7">
          <View className="gap-4">
            <Text selectable className="font-serif text-[56px] font-medium leading-[60px]">Hissab</Text>
            <View className="h-px w-12 bg-primary" />
            <View className="gap-2">
              <Text selectable className="text-[10px] font-bold leading-[14px] tracking-[1.8px] text-primary">
                CALM LEDGER. CLEAR RELATIONSHIPS.
              </Text>
              <Text selectable className="font-serif text-[32px] font-medium leading-[38px]">
                Keep the record clear.
              </Text>
              <Text selectable className="text-[15px] leading-[22px] text-muted-foreground">
                Shared expenses, and exactly who owes whom.
              </Text>
            </View>
          </View>
          <View className="gap-5">
            {points.map(([title, detail]) => (
              <View key={title} className="flex-row items-start gap-3">
                <View className="size-[26px] items-center justify-center border border-border">
                  <View className="h-0.5 w-2.5 bg-primary" />
                </View>
                <View className="flex-1 gap-0.5">
                  <Text selectable className="text-base font-semibold leading-6">{title}</Text>
                  <Text selectable className="text-[15px] leading-[22px] text-muted-foreground">{detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View className="gap-2.5">
          <Link href="/register" asChild><Button role="link"><Text>Create account</Text></Button></Link>
          <Link href="/sign-in" asChild><Button variant="outline" role="link"><Text>Sign in</Text></Button></Link>
          <Text selectable className="text-center text-xs leading-4 text-muted-foreground">
            Hissab records money that has already moved. It never transfers funds, links a bank account, or touches a card.
          </Text>
        </View>
      </View>
    </Screen>
  );
}
