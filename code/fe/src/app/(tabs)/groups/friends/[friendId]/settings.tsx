import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Avatar, Card, ErrorMessage, Row, Screen } from '@/components/ui';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import {
  ledgerBalancesQuery,
  userBalancesQuery
} from '@/features/balances/api';
import {
  block,
  blocksQuery,
  connectionsQuery
} from '@/features/connections/api';
import { homeQuery } from '@/features/home/api';

export default function FriendSettingsScreen() {
  const dialog = useDialog();
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { data } = useQuery(connectionsQuery);
  const friend = data?.find((item) => item.userId === friendId);
  const balances = useQuery({
    ...ledgerBalancesQuery(friend?.ledgerId ?? ''),
    enabled: Boolean(friend)
  });
  const blockFriend = useMutation({
    mutationFn: () => block(friendId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: connectionsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: blocksQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      router.replace('/groups/friends');
    }
  });
  const settled = (balances.data?.members ?? []).every(
    (member) => BigInt(member.netMinor) === 0n
  );
  const canBlock = Boolean(friend && balances.data && settled);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Friend settings' }} />
      <View className="flex-row items-center gap-4 py-2">
        <Avatar name={friend?.displayName ?? 'Friend'} large />
        <View className="flex-1 gap-0.5">
          <Text selectable className="text-2xl font-bold leading-[30px]">
            {friend?.displayName ?? 'Friend'}
          </Text>
          <Text
            selectable
            className="text-[15px] leading-[22px] text-muted-foreground"
          >
            {friend
              ? 'Active connection'
              : 'Open this page from your Friends list.'}
          </Text>
        </View>
      </View>
      {blockFriend.error || balances.error ? (
        <ErrorMessage error={blockFriend.error ?? balances.error} />
      ) : null}
      <Card>
        <Row
          title="Report person"
          href={{
            pathname: '/report',
            params: {
              targetType: 'USER',
              targetId: friendId,
              name: friend?.displayName ?? ''
            }
          }}
        />
        <Row title="Blocked people" href="/account/blocked-people" />
      </Card>
      <Card>
        <Row
          title={`Block ${friend?.displayName ?? 'person'}`}
          destructive
          disabled={!canBlock || blockFriend.isPending}
          detail={blockFriend.isPending ? 'Blocking…' : undefined}
          subtitle={
            balances.isLoading
              ? 'Checking your balance…'
              : balances.data && !settled
                ? 'Settle your balance first.'
                : 'Archives your shared ledger and removes the connection.'
          }
          onPress={() =>
            dialog(
              `Block ${friend?.displayName ?? 'person'}?`,
              'This archives the settled direct ledger. It does not delete its audit history.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Block person',
                  style: 'destructive',
                  onPress: () => blockFriend.mutate()
                }
              ]
            )
          }
        />
      </Card>
    </Screen>
  );
}
