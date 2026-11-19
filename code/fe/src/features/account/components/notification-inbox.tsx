import {
  ArrowLeftRight,
  BellRing,
  ReceiptText,
  UsersRound,
  type LucideIcon
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import type { InAppNotification } from '@/api/contracts';
import { ErrorMessage, IconTile, ListRow } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { reminderLedgerHref } from '@/features/reminders/navigation';
import { isolate } from '@/i18n';
import { formatDateTime } from '@/lib/dates';

const KIND_ICONS: Record<InAppNotification['kind'], LucideIcon> = {
  EXPENSE: ReceiptText,
  SETTLEMENT: ArrowLeftRight,
  SOCIAL: UsersRound,
  REMINDER: BellRing
};

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
  const { t } = useTranslation(['account', 'common']);
  return (
    <View>
      {error ? (
        <View className="gap-3 pb-4">
          <ErrorMessage error={error} />
          <Button variant="outline" onPress={onRetry}>
            <Text>{t('common:tryAgain')}</Text>
          </Button>
        </View>
      ) : null}
      {isLoading ? (
        <ActivityIndicator
          accessibilityLabel={t('loadingNotifications')}
          className="text-primary"
        />
      ) : items.length ? (
        items.map((item, index) => {
          const unread = !item.readAt;
          const linked = Boolean(
            reminderLedgerHref({ ...item.details, ...item })
          );
          const label = t(unread ? 'unreadNotification' : 'readNotification', {
            title: isolate(item.title),
            body: isolate(item.body),
            date: isolate(formatDateTime(item.createdAt))
          });
          return (
            <ListRow
              key={item.id}
              divided={index > 0}
              role={linked ? 'link' : 'button'}
              disabled={busy}
              accessibilityLabel={label}
              onPress={unread || linked ? () => onOpen(item) : undefined}
              leading={<IconTile icon={KIND_ICONS[item.kind]} />}
              title={item.title}
              subtitle={item.body}
              trailing={
                unread ? (
                  <View className="size-2.5 rounded-full bg-primary" />
                ) : undefined
              }
            >
              <Text className="text-[13px] font-normal leading-[18px] text-muted-foreground">
                {formatDateTime(item.createdAt)}
              </Text>
            </ListRow>
          );
        })
      ) : !error ? (
        <View className="items-center gap-2 py-10">
          <Text
            selectable
            className="text-center text-xl font-semibold leading-[26px]"
          >
            {t('noNotificationsYet')}
          </Text>
          <Text
            selectable
            className="text-center leading-6 text-muted-foreground"
          >
            {t('sharedChangesInvitationsFriendRequestsAndRemindersWillAppear')}
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
            <Text>{t('loadMore')}</Text>
          )}
        </Button>
      ) : null}
    </View>
  );
}
