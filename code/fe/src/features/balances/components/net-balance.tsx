import { View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { Text } from '@/components/ui/text';
import { absMinor, formatMinorAmount } from '@/lib/money';
import { useLargeText } from '@/lib/text-scale';
import { cn } from '@/lib/utils';

// Trailing list-row balance: tinted amount plus words, so direction never relies on colour alone.
export function NetBalance({
  netMinor,
  currency,
  member
}: {
  netMinor?: string;
  currency?: DisplayCurrency;
  member?: boolean;
}) {
  const largeText = useLargeText();
  if (netMinor === undefined || !currency) return null;
  const net = BigInt(netMinor);
  return (
    <View className={largeText ? undefined : 'items-end'}>
      {net ? (
        <Text
          selectable
          className={cn(
            'text-base font-semibold tabular-nums leading-[22px]',
            net > 0n ? 'text-positive' : 'text-destructive'
          )}
        >
          {formatMinorAmount(absMinor(net), currency)}
        </Text>
      ) : null}
      <Text
        selectable
        className="text-[13px] font-normal leading-[18px] text-muted-foreground"
      >
        {net > 0n
          ? member
            ? 'gets back'
            : 'you’re owed'
          : net < 0n
            ? member
              ? 'owes the group'
              : 'you owe'
            : 'Settled'}
      </Text>
    </View>
  );
}

export function netBalanceLabel(netMinor?: string, currency?: DisplayCurrency) {
  if (netMinor === undefined || !currency) return undefined;
  const net = BigInt(netMinor);
  if (!net) return 'Settled';
  const amount = formatMinorAmount(absMinor(net), currency);
  return net > 0n ? `you’re owed ${amount}` : `you owe ${amount}`;
}
