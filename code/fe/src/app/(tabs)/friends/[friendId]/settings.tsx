import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ActivityIndicator, Alert, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Avatar, Card, ErrorMessage, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
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
      router.replace('/friends');
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
            {friend ? 'Active connection' : 'Connection details unavailable'}
          </Text>
        </View>
      </View>
      <Card>
        <View className="gap-1 p-4">
          <Text
            selectable
            className="text-xs font-semibold leading-4 tracking-[0.4px] text-muted-foreground"
          >
            RELATIONSHIP
          </Text>
          <Text selectable className="leading-6">
            {friend
              ? 'Direct connection is active.'
              : 'Open this page from your Friends list.'}
          </Text>
        </View>
      </Card>
      {blockFriend.error || balances.error ? (
        <ErrorMessage error={blockFriend.error ?? balances.error} />
      ) : null}
      {balances.isLoading ? (
        <Notice title="Checking balances">
          Blocking remains unavailable until Hissab confirms this direct ledger
          is settled.
        </Notice>
      ) : null}
      {balances.data && !settled ? (
        <Notice title="Settle balances first">
          You cannot block this person until the direct-ledger balance is
          settled.
        </Notice>
      ) : null}
      {canBlock ? (
        <Notice title="Balances settled">
          Blocking archives this direct ledger and removes the active
          connection.
        </Notice>
      ) : null}
      <Button
        variant="destructiveOutline"
        disabled={!canBlock || blockFriend.isPending}
        accessibilityState={{
          disabled: !canBlock || blockFriend.isPending,
          busy: blockFriend.isPending
        }}
        onPress={() =>
          Alert.alert(
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
      >
        {blockFriend.isPending ? (
          <ActivityIndicator className="text-destructive" />
        ) : (
          <Text>Block person</Text>
        )}
      </Button>
      <Link href="/friends/blocked" asChild>
        <Button variant="outline" role="link">
          <Text>View blocked people</Text>
        </Button>
      </Link>
    </Screen>
  );
}
