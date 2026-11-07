import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useRef } from 'react';
import { ActivityIndicator, RefreshControl } from 'react-native';

import type { InAppNotification } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  markAllNotificationsRead,
  markNotificationRead,
  notificationInboxInfiniteQuery,
  notificationInboxQueryKey,
  unreadCountQuery
} from '@/features/account/api';
import { NotificationInbox } from '@/features/account/components/notification-inbox';
import { reminderLedgerHref } from '@/features/reminders/navigation';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

export default function InboxScreen() {
  const primary = useThemeVariable(THEME_VARIABLES.primaryText);
  const inbox = useInfiniteQuery(notificationInboxInfiniteQuery());
  const count = useQuery(unreadCountQuery);
  const pending = useRef(false);
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: notificationInboxQueryKey });
  const mutation = useMutation({
    mutationFn: (id: string | null) =>
      id ? markNotificationRead(id) : markAllNotificationsRead(),
    onSuccess: refresh,
    onSettled: () => {
      pending.current = false;
    }
  });
  const mark = (id: string | null) => {
    if (pending.current) return;
    pending.current = true;
    mutation.mutate(id);
  };
  const open = (item: InAppNotification) => {
    if (pending.current) return;
    if (!item.readAt) mark(item.id);
    const href = reminderLedgerHref({ ...item.details, ...item });
    if (href) router.push(href);
  };
  const unread =
    count.error || count.isFetching ? 0 : (count.data?.unreadCount ?? 0);
  return (
    <Screen
      refreshControl={
        <RefreshControl
          refreshing={inbox.isRefetching && !inbox.isFetchingNextPage}
          onRefresh={refresh}
          tintColor={primary}
          colors={[primary]}
        />
      }
    >
      <Stack.Screen
        options={{
          headerRight: () =>
            unread > 0 ? (
              <Button
                size="compact"
                variant="link"
                disabled={mutation.isPending}
                onPress={() => mark(null)}
              >
                {mutation.isPending && mutation.variables === null ? (
                  <ActivityIndicator className="text-primary" />
                ) : (
                  <Text>Mark all read</Text>
                )}
              </Button>
            ) : null
        }}
      />
      <NotificationInbox
        items={inbox.data?.pages.flatMap((page) => page.items) ?? []}
        error={inbox.error ?? mutation.error}
        isLoading={inbox.isLoading}
        hasNextPage={inbox.hasNextPage}
        isLoadingMore={inbox.isFetchingNextPage}
        busy={mutation.isPending}
        onOpen={open}
        onLoadMore={() => inbox.fetchNextPage()}
        onRetry={() => {
          mutation.reset();
          void refresh();
        }}
      />
    </Screen>
  );
}
