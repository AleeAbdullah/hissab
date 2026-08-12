import { View } from 'react-native';

import type { ActivityItem, DisplayCurrency } from '@/api/contracts';
import { Avatar } from '@/components/ui';
import { Text } from '@/components/ui/text';
import {
  activityTimeLabel,
  describeActivity
} from '@/features/activity/presentation';

export function ActivityEventRow({
  displayCurrency,
  item
}: {
  displayCurrency: DisplayCurrency;
  item: ActivityItem;
}) {
  const event = describeActivity(item, displayCurrency);
  return (
    <View
      accessibilityLabel={`${event.actor} ${event.action}. ${event.context}. ${activityTimeLabel(item.createdAt)}${event.amount ? `. ${event.amount}` : ''}`}
      className="min-h-[68px] flex-row items-center gap-3 border-b border-border p-3"
    >
      <Avatar name={event.actor} />
      <View className="flex-1 gap-px">
        <Text selectable className="text-base font-semibold leading-[22px]">
          {event.actor}
        </Text>
        <Text selectable className="text-[15px] leading-5">
          {event.action}
        </Text>
        <Text
          selectable
          className="text-[13px] leading-[18px] text-muted-foreground"
        >
          {event.context} · {activityTimeLabel(item.createdAt)}
        </Text>
      </View>
      {event.amount ? (
        <Text
          selectable
          className="max-w-[30%] text-right text-[15px] font-semibold leading-5"
        >
          {event.amount}
        </Text>
      ) : null}
    </View>
  );
}
