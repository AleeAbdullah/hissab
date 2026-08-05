import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Text, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Button, Card, ErrorMessage, Loading, Notice, Row, Screen } from '@/components/ui';
import { connectionsQuery } from '@/features/connections/api';
import {
  groupInvitationsQuery,
  groupMembersQuery,
  groupQuery,
  inviteGroupUser,
} from '@/features/groups/api';
import { useAppTheme } from '@/theme/theme';

export default function MembersSelectScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useQuery(groupQuery(groupId));
  const connections = useQuery(connectionsQuery);
  const members = useQuery(groupMembersQuery(groupId));
  const canInvite = group.data?.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  const invitations = useQuery({ ...groupInvitationsQuery(groupId), enabled: canInvite });
  const invite = useMutation({
    mutationFn: (userId: string) => inviteGroupUser(groupId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupInvitationsQuery(groupId).queryKey });
    },
  });
  const { colors } = useAppTheme();

  if (group.isLoading || connections.isLoading || members.isLoading) return <Loading />;
  if (group.error || connections.error || members.error || !group.data) return <Screen><ErrorMessage error={group.error ?? connections.error ?? members.error ?? new Error('Group not found.')} /></Screen>;

  const unavailable = new Set([
    ...(members.data ?? []).map((member) => member.userId),
    ...(invitations.data ?? []).map((invitation) => invitation.userId),
  ]);
  const candidates = (connections.data ?? []).filter((connection) => !unavailable.has(connection.userId));
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Invite members' }} />
      {invitations.error || invite.error ? <ErrorMessage error={invitations.error ?? invite.error} /> : null}
      {canInvite ? <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>Invite people from your current Hissab connections.</Text> : <Notice title="Invitations unavailable">Only active members can invite people to an active group.</Notice>}
      {candidates.length ? (
        <Card>
          {candidates.map((connection) => (
            <Row
              key={connection.userId}
              title={connection.displayName}
              subtitle={connection.email ?? 'Hissab connection'}
              trailing={<View style={{ width: 80 }}><Button title="Invite" secondary loading={invite.isPending && invite.variables === connection.userId} disabled={!canInvite || invite.isPending} onPress={() => invite.mutate(connection.userId)} /></View>}
            />
          ))}
        </Card>
      ) : (
        <Text selectable style={{ color: colors.secondary, fontSize: 16, lineHeight: 24, textAlign: 'center', paddingVertical: 24 }}>All of your current connections are already members or have a pending invitation.</Text>
      )}
    </Screen>
  );
}
