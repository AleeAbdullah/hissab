import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { unreadCountQuery } from '@/features/account/api';

export function InboxButton() {
  const { t } = useTranslation(['account', 'common']);
  const count = useQuery(unreadCountQuery);
  // The count is persisted; show it only once this mount has fetched it, and keep it through refetches.
  const unread =
    count.isFetchedAfterMount && !count.error
      ? (count.data?.unreadCount ?? 0)
      : 0;
  return (
    <Link href="/home/inbox" asChild>
      <Button
        variant="ghost"
        role="link"
        className="min-w-12 px-3"
        accessibilityLabel={
          unread > 0 ? t('inboxUnread', { count: unread }) : t('inbox')
        }
      >
        <Icon as={Inbox} size={24} className="text-primary" />
        {unread > 0 ? (
          <View className="absolute end-0 top-0 min-w-5 items-center rounded-full bg-primary px-1">
            <Text className="text-xs font-semibold leading-4 text-primary-foreground">
              {unread > 99 ? t('badgeOverflow') : unread}
            </Text>
          </View>
        ) : null}
      </Button>
    </Link>
  );
}
