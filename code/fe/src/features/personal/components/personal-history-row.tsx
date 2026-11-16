import type { Href } from 'expo-router';
import { View } from 'react-native';

import type { DisplayCurrency, PersonalHistoryItem } from '@/api/contracts';
import { IconTile, ListRow } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { CATEGORY_ICONS } from '@/features/personal/components/category-picker';
import { formatMinorAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

export function PersonalHistoryRow({
  displayCurrency,
  item,
  divided
}: {
  displayCurrency: DisplayCurrency;
  item: PersonalHistoryItem;
  divided?: boolean;
}) {
  const shared = item.kind === 'SHARED';
  const income = item.type === 'INCOME';
  const amount = `${income ? '+' : ''}${formatMinorAmount(item.amountMinor, displayCurrency)}`;
  const total = shared
    ? `of ${formatMinorAmount(item.totalMinor ?? '0', displayCurrency)}`
    : undefined;
  const subtitle = shared
    ? `Shared · ${item.ledgerName ?? 'Shared ledger'}`
    : item.category.name;
  const href: Href = shared
    ? { pathname: '/expense/[expenseId]', params: { expenseId: item.id } }
    : {
        pathname: '/personal/[transactionId]',
        params: { transactionId: item.id }
      };
  return (
    <ListRow
      href={href}
      divided={divided}
      accessibilityLabel={[
        item.description,
        subtitle,
        shared ? `Your share ${amount} ${total}` : amount
      ].join('. ')}
      leading={<IconTile icon={CATEGORY_ICONS[item.category.code]} />}
      title={item.description}
      subtitle={subtitle}
      trailing={
        <View className="items-end">
          <Text
            selectable
            className={cn(
              'text-base font-semibold tabular-nums leading-[22px]',
              income && 'text-positive'
            )}
          >
            {amount}
          </Text>
          {total ? (
            <Text
              selectable
              className="text-[13px] font-normal leading-[18px] text-muted-foreground"
            >
              {total}
            </Text>
          ) : null}
        </View>
      }
    />
  );
}
