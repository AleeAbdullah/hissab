import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Settings } from 'lucide-react-native';
import { View } from 'react-native';

import { Avatar, ErrorMessage, Loading, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { FriendGroupBalances } from '@/features/balances/components/friend-group-balances';
import { connectionsQuery } from '@/features/connections/api';
import { LedgerActions } from '@/features/ledger/components/ledger-actions';
import { LedgerActivity } from '@/features/ledger/components/ledger-activity';
import { LedgerBalancePanel } from '@/features/ledger/components/ledger-balance-panel';

export default function FriendDetailScreen() {
  const { friendId, ledgerId } = useLocalSearchParams<{
    friendId: string;
    ledgerId?: string;
  }>();
  const connections = useQuery(connectionsQuery);
  const profile = useQuery(profileQuery);
  const friend = connections.data?.find((item) => item.userId === friendId);
  const balances = useQuery({
    ...ledgerBalancesQuery(friend?.ledgerId ?? ''),
    enabled: Boolean(friend)
  });
  if (
    connections.isLoading ||
    profile.isLoading ||
    (friend && balances.isLoading)
  )
    return <Loading />;
  if (connections.error || profile.error)
    return (
      <Screen>
        <ErrorMessage error={connections.error ?? profile.error} />
        <Button
          variant="outline"
          onPress={() => {
            void connections.refetch();
            void profile.refetch();
          }}
        >
          <Text>Retry</Text>
        </Button>
      </Screen>
    );
  if (!friend)
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Direct ledger' }} />
        <Text selectable className="text-lg font-semibold">
          This direct ledger is no longer active
        </Text>
        <Text selectable className="text-muted-foreground">
          Your accessible financial history remains in Activity.
        </Text>
        <Link
          href={
            ledgerId
              ? { pathname: '/activity', params: { ledgerId } }
              : '/activity'
          }
          asChild
        >
          <Button role="link">
            <Text>View history in Activity</Text>
          </Button>
        </Link>
      </Screen>
    );
  if (balances.error || !balances.data || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={balances.error ?? new Error('Balances unavailable.')}
        />
        <Button variant="outline" onPress={() => balances.refetch()}>
          <Text>Retry</Text>
        </Button>
      </Screen>
    );
  const draft = {
    ledgerId: friend.ledgerId,
    ledgerName: friend.displayName,
    currentUserId: profile.data.id,
    displayCurrency: profile.data.displayCurrency,
    members: [
      { userId: profile.data.id, displayName: profile.data.displayName },
      { userId: friend.userId, displayName: friend.displayName }
    ]
  };
  return (
    <Screen
      footer={<LedgerActions draft={draft} balances={balances.data} direct />}
    >
      <Stack.Screen
        options={{
          title: friend.displayName,
          headerTitle: () => <View />,
          headerRight: () => (
            <Link
              href={{
                pathname: '/groups/friends/[friendId]/settings',
                params: { friendId }
              }}
              asChild
            >
              <Button
                className="w-12 px-0"
                variant="ghost"
                role="link"
                accessibilityLabel="Friend settings"
              >
                <Icon as={Settings} size={22} className="text-primary" />
              </Button>
            </Link>
          )
        }}
      />
      <View className="flex-row items-center gap-4 py-2">
        <Avatar name={friend.displayName} large />
        <View className="min-w-0 flex-1 gap-1">
          <Text
            selectable
            accessibilityRole="header"
            className="text-[32px] font-semibold leading-[38px]"
          >
            {friend.displayName}
          </Text>
          {friend.email ? (
            <Text
              selectable
              className="text-[15px] leading-[22px] text-muted-foreground"
            >
              {friend.email}
            </Text>
          ) : null}
        </View>
      </View>
      <LedgerBalancePanel
        balances={balances.data}
        draft={draft}
        canRecord
        direct
      />
      <FriendGroupBalances
        friendId={friend.userId}
        friendName={friend.displayName}
        viewerId={profile.data.id}
        displayCurrency={profile.data.displayCurrency}
      />
      <LedgerActivity
        displayCurrency={profile.data.displayCurrency}
        ledgerId={friend.ledgerId}
        ledgerName={friend.displayName}
        members={draft.members}
        currentUserId={profile.data.id}
      />
    </Screen>
  );
}
