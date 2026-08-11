import { ActivityIndicator, View } from 'react-native';

import type { InAppNotification } from '@/api/contracts';
import { Card, ErrorMessage, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function NotificationInbox({ error, hasNextPage, isLoading, isMarkingAll, isLoadingMore, items, markingId, onLoadMore, onMarkAllRead, onMarkRead }: {
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
    <View className="gap-2">
      <View className="min-h-11 flex-row items-center justify-between gap-3">
        <SectionLabel>INBOX{unreadCount ? ` · ${unreadCount} UNREAD` : ''}</SectionLabel>
        {unreadCount ? <Button variant="outline" disabled={isMarkingAll} accessibilityState={{ disabled: isMarkingAll, busy: isMarkingAll }} onPress={onMarkAllRead}>{isMarkingAll ? <ActivityIndicator className="text-primary" /> : <Text>Mark all read</Text>}</Button> : null}
      </View>
      {error ? <ErrorMessage error={error} /> : null}
      {isLoading ? <NotificationLoading /> : items.length ? <Card>{items.map((item) => <NotificationRow key={item.id} item={item} loading={markingId === item.id || isMarkingAll} onPress={onMarkRead} />)}</Card> : <EmptyInbox />}
      {hasNextPage ? <Button variant="outline" disabled={isLoadingMore} accessibilityState={{ disabled: isLoadingMore, busy: isLoadingMore }} onPress={onLoadMore}>{isLoadingMore ? <ActivityIndicator className="text-primary" /> : <Text>Load more notifications</Text>}</Button> : null}
    </View>
  );
}

function NotificationRow({ item, loading, onPress }: { item: InAppNotification; loading: boolean; onPress: (id: string) => void }) {
  const unread = !item.readAt;
  const content = <>
    <View className="flex-row items-baseline gap-2">
      <Text selectable className={cn('flex-1 text-base leading-[22px]', unread ? 'font-bold' : 'font-semibold')}>{item.title}</Text>
      {unread ? <Text selectable className="text-xs font-bold leading-4 text-primary">Unread</Text> : null}
    </View>
    <Text selectable className="text-sm leading-5 text-muted-foreground">{item.body}</Text>
    <Text selectable className="text-xs leading-4 text-muted-foreground">{notificationTime(item.createdAt)}</Text>
  </>;
  const className = cn('min-h-[72px] gap-1 border-b border-border p-3', unread && 'bg-accent', loading && 'opacity-[0.55]');
  return unread ? (
    <Button variant="ghost" accessibilityLabel={`Unread. ${item.title}. ${item.body}. ${notificationTime(item.createdAt)}`} accessibilityState={{ disabled: loading }} disabled={loading} onPress={() => onPress(item.id)} className={cn('w-full flex-col items-stretch rounded-none', className)}>{content}</Button>
  ) : <View className={className}>{content}</View>;
}

function NotificationLoading() {
  return <Text selectable className="text-[15px] leading-[22px] text-muted-foreground">Loading notifications…</Text>;
}

function EmptyInbox() {
  return <Text selectable className="text-[15px] leading-[22px] text-muted-foreground">You’re all caught up.</Text>;
}

function notificationTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
