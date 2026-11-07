import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Inbox } from 'lucide-react-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { unreadCountQuery } from '@/features/account/api';

export function InboxButton() {
  const count = useQuery(unreadCountQuery);
  const unread =
    count.isFetching || count.error ? 0 : (count.data?.unreadCount ?? 0);
  return (
    <Link href="/home/inbox" asChild>
      <Button
        variant="ghost"
        role="link"
        className="min-w-12 px-3"
        accessibilityLabel={unread > 0 ? `Inbox, ${unread} unread` : 'Inbox'}
      >
        <Icon as={Inbox} size={24} className="text-primary" />
        {unread > 0 ? (
          <View className="absolute right-0 top-0 min-w-5 items-center rounded-full bg-primary px-1">
            <Text className="text-xs font-semibold leading-4 text-primary-foreground">
              {unread > 99 ? '99+' : unread}
            </Text>
          </View>
        ) : null}
      </Button>
    </Link>
  );
}
