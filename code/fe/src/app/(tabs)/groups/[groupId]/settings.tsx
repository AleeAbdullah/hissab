import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Button, ErrorMessage, Loading, Notice, Screen } from '@/components/ui';
import { archiveGroup, groupQuery, groupsQuery, leaveGroup } from '@/features/groups/api';

export default function GroupSettingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useQuery(groupQuery(groupId));
  const leave = useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey });
      router.replace('/groups');
    },
  });
  const archive = useMutation({
    mutationFn: () => archiveGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey });
      router.replace('/groups');
    },
  });

  if (group.isLoading) return <Loading />;
  if (group.error || !group.data) return <Screen><ErrorMessage error={group.error ?? new Error('Group not found.')} /></Screen>;

  const canManage = group.data.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  const pending = leave.isPending || archive.isPending;
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Group settings' }} />
      {leave.error || archive.error ? <ErrorMessage error={leave.error ?? archive.error} /> : null}
      {canManage ? <Notice title="Settlement check">The backend prevents leaving or archiving while any required group balances remain unsettled.</Notice> : <Notice title="Settings unavailable">Only active members can manage an active group.</Notice>}
      {canManage ? <Button title="Leave group" secondary destructive disabled={pending} loading={leave.isPending} onPress={() => Alert.alert('Leave group?', `You will lose access to ${group.data.name}'s active ledger. This cannot be undone.`, [{ text: 'Stay in group', style: 'cancel' }, { text: 'Leave group', style: 'destructive', onPress: () => leave.mutate() }])} /> : null}
      {canManage ? <Button title="Archive group" destructive disabled={pending} loading={archive.isPending} onPress={() => Alert.alert('Archive group?', `Archive ${group.data.name} for everyone once all group balances are settled.`, [{ text: 'Keep group', style: 'cancel' }, { text: 'Archive group', style: 'destructive', onPress: () => archive.mutate() }])} /> : null}
    </Screen>
  );
}
