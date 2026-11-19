import type { Href } from 'expo-router';
import {
  ArrowLeftRight,
  UserRound,
  UsersRound,
  type LucideIcon
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { ActivityItem, DisplayCurrency } from '@/api/contracts';
import { IconTile, ListRow } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { activityRow } from '@/features/activity/presentation';
import { CATEGORY_ICONS } from '@/features/personal/components/category-picker';
import { isolate } from '@/i18n';
import { cn } from '@/lib/utils';

export function ActivityEventRow({
  displayCurrency,
  currentUserId,
  item,
  divided
}: {
  displayCurrency: DisplayCurrency;
  currentUserId: string;
  item: ActivityItem;
  divided?: boolean;
}) {
  const { t } = useTranslation(['activity', 'common']);
  const row = activityRow(item, displayCurrency, currentUserId);
  const icon: LucideIcon =
    'categoryCode' in row && row.categoryCode
      ? CATEGORY_ICONS[row.categoryCode]
      : item.area === 'SETTLEMENT'
        ? ArrowLeftRight
        : item.area === 'GROUP'
          ? UsersRound
          : UserRound;
  const href: Href | undefined =
    item.area === 'EXPENSE'
      ? {
          pathname: '/expense/[expenseId]',
          params: { expenseId: item.aggregateId }
        }
      : item.area === 'SETTLEMENT'
        ? {
            pathname: '/payment/[paymentId]',
            params: { paymentId: item.aggregateId }
          }
        : undefined;
  const subtitle = 'subtitle' in row ? row.subtitle : undefined;
  const amount = 'amount' in row ? row.amount : undefined;
  const deleted = 'deleted' in row && row.deleted;
  const effect = 'effect' in row ? row.effect : undefined;
  const lent = 'lent' in row && row.lent;
  return (
    <ListRow
      href={href}
      divided={divided}
      accessibilityLabel={t('rowLabel', {
        title: isolate(row.title),
        subtitle: isolate(subtitle ?? ''),
        amount: isolate(
          amount
            ? deleted
              ? t('deletedAmount', { amount: isolate(amount) })
              : amount
            : ''
        ),
        effect: isolate(effect ?? '')
      })}
      leading={<IconTile icon={icon} />}
      title={row.title}
      subtitle={subtitle}
      trailing={
        amount ? (
          <View className="items-end">
            <Text
              selectable
              className={cn(
                'text-base font-semibold tabular-nums leading-[22px]',
                deleted && 'text-muted-foreground line-through'
              )}
            >
              {amount}
            </Text>
            {effect ? (
              <Text
                selectable
                className={cn(
                  'text-[13px] leading-[18px]',
                  lent ? 'text-positive' : 'text-destructive'
                )}
              >
                {effect}
              </Text>
            ) : null}
          </View>
        ) : undefined
      }
    />
  );
}
