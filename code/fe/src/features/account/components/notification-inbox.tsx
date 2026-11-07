import { ChevronRight } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import type { InAppNotification } from '@/api/contracts';
import { ErrorMessage } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { reminderLedgerHref } from '@/features/reminders/navigation';
import { formatDateTime } from '@/lib/dates';
import { cn } from '@/lib/utils';

export function NotificationInbox({
  error,
  hasNextPage,
  isLoading,
  isLoadingMore,
  busy,
  items,
  onLoadMore,
  onOpen,
  onRetry
}: {
  error: unknown;
  hasNextPage: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  busy: boolean;
  items: InAppNotification[];
  onLoadMore: () => void;
  onOpen: (notification: InAppNotification) => void;
  onRetry: () => void;
}) {
  return (
    <View>
      {error ? (
        <View className="gap-3 pb-4">
          <ErrorMessage error={error} />
          <Button variant="outline" onPress={onRetry}>
            <Text>Try again</Text>
          </Button>
        </View>
      ) : null}
      {isLoading ? (
        <ActivityIndicator
          accessibilityLabel="Loading notifications"
          className="text-primary"
        />
      ) : items.length ? (
        items.map((item) => {
          const unread = !item.readAt;
          const linked = Boolean(
            reminderLedgerHref({ ...item.details, ...item })
          );
          const content = (
            <View className="w-full gap-1">
              <View className="flex-row items-center gap-2">
                {unread ? (
                  <View className="size-2 rounded-full bg-primary" />
                ) : null}
                <Text
                  className={cn(
                    'flex-1 text-base leading-[22px]',
                    unread ? 'font-semibold' : 'font-normal'
                  )}
                >
                  {item.title}
                </Text>
                {linked ? (
                  <Icon
                    as={ChevronRight}
                    size={20}
                    className="text-muted-foreground"
                  />
                ) : null}
              </View>
              <Text
                numberOfLines={2}
                className="text-[15px] font-normal leading-[22px] text-muted-foreground"
              >
                {item.body}
              </Text>
              <Text className="text-[13px] font-normal leading-[18px] text-muted-foreground">
                {formatDateTime(item.createdAt)}
              </Text>
            </View>
          );
          const label = `${unread ? 'Unread. ' : ''}${item.title}. ${item.body}. ${formatDateTime(item.createdAt)}`;
          return unread || linked ? (
            <Button
              key={item.id}
              variant="ghost"
              role={linked ? 'link' : 'button'}
              disabled={busy}
              accessibilityLabel={label}
              onPress={() => onOpen(item)}
              className="w-full rounded-none border-b border-border px-0 py-4"
            >
              {content}
            </Button>
          ) : (
            <View
              key={item.id}
              accessible
              accessibilityLabel={label}
              className="border-b border-border py-4"
            >
              {content}
            </View>
          );
        })
      ) : !error ? (
        <View className="gap-2 py-8">
          <Text className="text-lg font-semibold">No notifications yet</Text>
          <Text className="text-[15px] leading-[22px] text-muted-foreground">
            Shared changes, invitations, connection requests and reminders
            appear here.
          </Text>
        </View>
      ) : null}
      {hasNextPage ? (
        <Button
          variant="outline"
          disabled={isLoadingMore}
          onPress={onLoadMore}
          className="mt-4"
        >
          {isLoadingMore ? (
            <ActivityIndicator className="text-primary" />
          ) : (
            <Text>Load more</Text>
          )}
        </Button>
      ) : null}
    </View>
  );
}
