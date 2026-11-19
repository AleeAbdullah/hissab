import type { Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { DisplayCurrency, PersonalHistoryItem } from '@/api/contracts';
import { IconTile, ListRow } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { CATEGORY_ICONS } from '@/features/personal/components/category-picker';
import { isolate } from '@/i18n';
import { categoryName } from '@/i18n/categories';
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
  const { t } = useTranslation(['personal', 'common']);
  const shared = item.kind === 'SHARED';
  const income = item.type === 'INCOME';
  const amount = income
    ? t('signedIncome', {
        amount: isolate(formatMinorAmount(item.amountMinor, displayCurrency))
      })
    : formatMinorAmount(item.amountMinor, displayCurrency);
  const total = shared
    ? t('ofTotal', {
        amount: isolate(
          formatMinorAmount(item.totalMinor ?? '0', displayCurrency)
        )
      })
    : undefined;
  const subtitle = shared
    ? t('sharedLedgerLabel', {
        ledger: isolate(item.ledgerName ?? t('sharedLedger'))
      })
    : categoryName(item.category.code);
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
      accessibilityLabel={
        shared
          ? t('sharedHistoryLabel', {
              description: isolate(item.description),
              category: subtitle,
              amount: isolate(amount),
              total: isolate(
                formatMinorAmount(item.totalMinor ?? '0', displayCurrency)
              )
            })
          : t('historyLabel', {
              description: isolate(item.description),
              category: subtitle,
              amount: isolate(amount)
            })
      }
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
