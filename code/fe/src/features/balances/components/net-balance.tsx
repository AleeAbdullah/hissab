import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { Text } from '@/components/ui/text';
import { i18n, isolate } from '@/i18n';
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
  const { t } = useTranslation(['balances', 'common']);
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
            ? t('getsBack')
            : t('youReOwed')
          : net < 0n
            ? member
              ? t('owesTheGroup')
              : t('youOwe')
            : t('settled')}
      </Text>
    </View>
  );
}

export function netBalanceLabel(netMinor?: string, currency?: DisplayCurrency) {
  if (netMinor === undefined || !currency) return undefined;
  const net = BigInt(netMinor);
  if (!net) return i18n.t('balances:settled');
  const amount = formatMinorAmount(absMinor(net), currency);
  return net > 0n
    ? i18n.t('balances:youReOwed2', { amount: isolate(amount) })
    : i18n.t('balances:youOwe2', { amount: isolate(amount) });
}
