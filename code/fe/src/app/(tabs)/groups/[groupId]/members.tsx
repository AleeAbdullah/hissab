import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Alert, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Button, Card, ErrorMessage, Loading, Notice, Row, Screen, SectionLabel } from '@/components/ui';
import {
  cancelGroupInvitation,
  groupInvitationsQuery,
  groupMembersQuery,
  groupQuery,
} from '@/features/groups/api';

export default function GroupMembersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useQuery(groupQuery(groupId));
  const members = useQuery(groupMembersQuery(groupId));
  const canManage = group.data?.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  const invitations = useQuery({ ...groupInvitationsQuery(groupId), enabled: canManage });
  const cancel = useMutation({
    mutationFn: (userId: string) => cancelGroupInvitation(groupId, userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: groupInvitationsQuery(groupId).queryKey });
    },
  });

  if (group.isLoading || members.isLoading) return <Loading />;
  if (group.error || members.error || !group.data) return <Screen><ErrorMessage error={group.error ?? members.error ?? new Error('Group not found.')} /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Members' }} />
      {invitations.error || cancel.error ? <ErrorMessage error={invitations.error ?? cancel.error} /> : null}
      <SectionLabel>MEMBERS</SectionLabel>
      <Card>
        {(members.data ?? []).map((member) => (
          <Row
            key={member.userId}
            title={member.displayName}
            subtitle={member.status === 'ACTIVE' ? 'Active member' : member.status.toLowerCase()}
          />
        ))}
      </Card>
      {canManage ? <Button title="Invite member" href={{ pathname: '/members-select', params: { groupId } }} /> : null}
      {invitations.data?.length ? (
        <View style={{ gap: 12 }}>
          <SectionLabel>PENDING INVITATIONS</SectionLabel>
          <Card>
            {invitations.data.map((invitation) => (
              <Row
                key={invitation.userId}
                title={invitation.userDisplayName}
                subtitle={`Invited by ${invitation.invitedByDisplayName}`}
                trailing={<View style={{ width: 88 }}><Button title="Cancel" secondary destructive loading={cancel.isPending && cancel.variables === invitation.userId} disabled={cancel.isPending} onPress={() => Alert.alert('Cancel invitation?', `Remove ${invitation.userDisplayName}'s pending invitation to ${group.data.name}?`, [{ text: 'Keep invitation', style: 'cancel' }, { text: 'Cancel invitation', style: 'destructive', onPress: () => cancel.mutate(invitation.userId) }])} /></View>}
              />
            ))}
          </Card>
        </View>
      ) : null}
      {!canManage ? <Notice title="Member changes unavailable">Only active members can invite people or cancel pending invitations.</Notice> : null}
    </Screen>
  );
}
