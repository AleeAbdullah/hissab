import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Alert, Text, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Avatar, Button, Card, ErrorMessage, Notice, Screen } from '@/components/ui';
import { ledgerBalancesQuery, userBalancesQuery } from '@/features/balances/api';
import { block, blocksQuery, connectionsQuery } from '@/features/connections/api';
import { homeQuery } from '@/features/home/api';
import { useAppTheme } from '@/theme/theme';

export default function FriendSettingsScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { data } = useQuery(connectionsQuery);
  const friend = data?.find((item) => item.userId === friendId);
  const balances = useQuery({ ...ledgerBalancesQuery(friend?.ledgerId ?? ''), enabled: Boolean(friend) });
  const blockFriend = useMutation({
    mutationFn: () => block(friendId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: connectionsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: blocksQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
      ]);
      router.replace('/friends');
    },
  });
  const { colors } = useAppTheme();
  const settled = (balances.data?.members ?? []).every((member) => BigInt(member.netMinor) === 0n);
  const canBlock = Boolean(friend && balances.data && settled);

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Friend settings' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 }}>
        <Avatar name={friend?.displayName ?? 'Friend'} large />
        <View style={{ flex: 1, gap: 2 }}>
          <Text selectable style={{ color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700' }}>{friend?.displayName ?? 'Friend'}</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>{friend ? 'Active connection' : 'Connection details unavailable'}</Text>
        </View>
      </View>
      <Card>
        <View style={{ padding: 16, gap: 4 }}>
          <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 }}>RELATIONSHIP</Text>
          <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{friend ? 'Direct connection is active.' : 'Open this page from your Friends list.'}</Text>
        </View>
      </Card>
      {blockFriend.error || balances.error ? <ErrorMessage error={blockFriend.error ?? balances.error} /> : null}
      {balances.isLoading ? <Notice title="Checking balances">Blocking remains unavailable until Hissab confirms this direct ledger is settled.</Notice> : null}
      {balances.data && !settled ? <Notice title="Settle balances first">You cannot block this person until the direct-ledger balance is settled.</Notice> : null}
      {canBlock ? <Notice title="Balances settled">Blocking archives this direct ledger and removes the active connection.</Notice> : null}
      <Button title="Block person" secondary destructive loading={blockFriend.isPending} disabled={!canBlock || blockFriend.isPending} onPress={() => Alert.alert(`Block ${friend?.displayName ?? 'person'}?`, 'This archives the settled direct ledger. It does not delete its audit history.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Block person', style: 'destructive', onPress: () => blockFriend.mutate() }])} />
      <Button title="View blocked people" href="/friends/blocked" secondary />
    </Screen>
  );
}
