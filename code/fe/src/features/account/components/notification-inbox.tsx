import { Pressable, Text, View } from 'react-native';

import type { InAppNotification } from '@/api/contracts';
import { Button, Card, ErrorMessage, SectionLabel } from '@/components/ui';
import { useAppTheme } from '@/theme/theme';

export function NotificationInbox({
  error,
  hasNextPage,
  isLoading,
  isMarkingAll,
  isLoadingMore,
  items,
  markingId,
  onLoadMore,
  onMarkAllRead,
  onMarkRead,
}: {
  error: unknown;
  hasNextPage: boolean;
  isLoading: boolean;
  isMarkingAll: boolean;
  isLoadingMore: boolean;
  items: InAppNotification[];
  markingId?: string;
  onLoadMore: () => void;
  onMarkAllRead: () => void;
  onMarkRead: (notificationId: string) => void;
}) {
  const unreadCount = items.filter((item) => !item.readAt).length;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <SectionLabel>INBOX{unreadCount ? ` · ${unreadCount} UNREAD` : ''}</SectionLabel>
        {unreadCount ? <Button title="Mark all read" secondary loading={isMarkingAll} onPress={onMarkAllRead} /> : null}
      </View>
      {error ? <ErrorMessage error={error} /> : null}
      {isLoading ? <NotificationLoading /> : items.length ? <Card>{items.map((item) => <NotificationRow key={item.id} item={item} loading={markingId === item.id || isMarkingAll} onPress={onMarkRead} />)}</Card> : <EmptyInbox />}
      {hasNextPage ? <Button title="Load more notifications" secondary loading={isLoadingMore} onPress={onLoadMore} /> : null}
    </View>
  );
}

function NotificationRow({ item, loading, onPress }: { item: InAppNotification; loading: boolean; onPress: (id: string) => void }) {
  const { colors } = useAppTheme();
  const unread = !item.readAt;
  return (
    <Pressable
      accessibilityLabel={`${unread ? 'Unread. ' : ''}${item.title}. ${item.body}. ${notificationTime(item.createdAt)}`}
      accessibilityRole={unread ? 'button' : undefined}
      accessibilityState={{ disabled: !unread || loading }}
      disabled={!unread || loading}
      onPress={() => onPress(item.id)}
      style={{ minHeight: 72, gap: 4, padding: 12, backgroundColor: unread ? colors.brandSubtle : undefined, borderBottomWidth: 1, borderBottomColor: colors.divider, opacity: loading ? 0.55 : 1 }}
    >
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
        <Text selectable style={{ flex: 1, color: colors.text, fontSize: 16, lineHeight: 22, fontWeight: unread ? '700' : '600' }}>{item.title}</Text>
        {unread ? <Text selectable style={{ color: colors.brand, fontSize: 12, lineHeight: 16, fontWeight: '700' }}>Unread</Text> : null}
      </View>
      <Text selectable style={{ color: colors.secondary, fontSize: 14, lineHeight: 20 }}>{item.body}</Text>
      <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16 }}>{notificationTime(item.createdAt)}</Text>
    </Pressable>
  );
}

function NotificationLoading() {
  const { colors } = useAppTheme();
  return <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>Loading notifications…</Text>;
}

function EmptyInbox() {
  const { colors } = useAppTheme();
  return <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>You’re all caught up.</Text>;
}

function notificationTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
