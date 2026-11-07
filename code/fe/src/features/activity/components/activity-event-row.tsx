import { Link, type Href } from 'expo-router';
import {
  FileText,
  Trash2,
  ArrowLeftRight,
  UsersRound,
  UserRound
} from 'lucide-react-native';
import { View, useWindowDimensions } from 'react-native';

import type { ActivityItem, DisplayCurrency } from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  activityTimeLabel,
  activityOccurrenceLabel,
  describeActivity
} from '@/features/activity/presentation';

export function ActivityEventRow({
  displayCurrency,
  currentUserId,
  item
}: {
  displayCurrency: DisplayCurrency;
  currentUserId: string;
  item: ActivityItem;
}) {
  const event = describeActivity(item, displayCurrency, currentUserId);
  const { fontScale } = useWindowDimensions();
  const deleted = item.eventType.endsWith('_DELETED');
  const edited = item.eventType.endsWith('_REPLACED');
  const revision =
    edited && event.version ? ` · revision ${event.version}` : '';
  const occurrence = activityOccurrenceLabel(event.occurredAt, item.createdAt);
  const subject = `“${event.amount ? event.subject : event.context}”`;
  const amountLabel = event.amount
    ? `${event.amount} ${item.area === 'EXPENSE' ? 'total' : 'payment'}`
    : undefined;
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
  const icon = deleted
    ? Trash2
    : item.area === 'EXPENSE'
      ? FileText
      : item.area === 'SETTLEMENT'
        ? ArrowLeftRight
        : item.area === 'GROUP'
          ? UsersRound
          : UserRound;
  const amount = event.amount ? (
    <Text
      selectable
      className={`text-[15px] font-normal leading-[20px] ${deleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}
    >
      {amountLabel}
    </Text>
  ) : null;
  const content = (
    <View
      className={
        fontScale >= 1.3
          ? 'w-full items-start gap-2'
          : 'w-full flex-row items-start gap-3'
      }
    >
      <Icon
        as={icon}
        size={22}
        accessible={false}
        className="mt-1 text-muted-foreground"
      />
      <View
        className={fontScale >= 1.3 ? 'w-full gap-1' : 'min-w-0 flex-1 gap-1'}
      >
        <Text selectable className="text-[16px] font-normal leading-[22px]">
          <Text className="font-semibold">{event.actor}</Text> {event.action}{' '}
          <Text className="font-semibold">{subject}</Text>
          {event.amount ? ` in ${event.context}` : ''}
          {revision}
        </Text>
        {amount}
        <Text
          selectable
          className="text-[13px] font-normal leading-[18px] text-muted-foreground"
        >
          {activityTimeLabel(item.createdAt)}
          {occurrence}
        </Text>
      </View>
    </View>
  );
  const label = `${event.actor} ${event.action} ${subject}${event.amount ? ` in ${event.context}` : ''}${revision}. ${amountLabel ? `${amountLabel}. ` : ''}${activityTimeLabel(item.createdAt)}${occurrence}`;
  return href ? (
    <Link href={href} asChild>
      <Button
        variant="ghost"
        role="link"
        accessibilityLabel={label}
        className="w-full items-stretch justify-start rounded-none border-b border-border px-0 py-4"
      >
        {content}
      </Button>
    </Link>
  ) : (
    <View
      accessible
      accessibilityLabel={label}
      className="border-b border-border py-4"
    >
      {content}
    </View>
  );
}
