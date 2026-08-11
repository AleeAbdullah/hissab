import { Text, View } from 'react-native';

import type { ActivityItem, DisplayCurrency } from '@/api/contracts';
import { Avatar } from '@/components/ui';
import { activityTimeLabel, describeActivity } from '@/features/activity/presentation';
import { useAppTheme } from '@/theme/theme';

export function ActivityEventRow({ displayCurrency, item }: { displayCurrency: DisplayCurrency; item: ActivityItem }) {
  const { colors } = useAppTheme();
  const event = describeActivity(item, displayCurrency);
  return (
    <View
      accessibilityLabel={`${event.actor} ${event.action}. ${event.context}. ${activityTimeLabel(item.createdAt)}${event.amount ? `. ${event.amount}` : ''}`}
      style={{ minHeight: 68, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.divider }}
    >
      <Avatar name={event.actor} />
      <View style={{ flex: 1, gap: 1 }}>
        <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: '600' }}>{event.actor}</Text>
        <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 20 }}>{event.action}</Text>
        <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>{event.context} · {activityTimeLabel(item.createdAt)}</Text>
      </View>
      {event.amount ? <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '600', textAlign: 'right', maxWidth: '30%' }}>{event.amount}</Text> : null}
    </View>
  );
}
