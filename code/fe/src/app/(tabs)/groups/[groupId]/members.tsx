import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ActivityIndicator, Alert, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Card, ErrorMessage, Loading, Notice, Row, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
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
      {canManage ? <Link href={{ pathname: '/members-select', params: { groupId } }} asChild><Button role="link"><Text>Invite member</Text></Button></Link> : null}
      {invitations.data?.length ? (
        <View className="gap-3">
          <SectionLabel>PENDING INVITATIONS</SectionLabel>
          <Card>
            {invitations.data.map((invitation) => (
              <Row
                key={invitation.userId}
                title={invitation.userDisplayName}
                subtitle={`Invited by ${invitation.invitedByDisplayName}`}
                trailing={<View className="shrink-0"><Button variant="destructiveOutline" disabled={cancel.isPending} accessibilityState={{ disabled: cancel.isPending, busy: cancel.isPending && cancel.variables === invitation.userId }} onPress={() => Alert.alert('Cancel invitation?', `Remove ${invitation.userDisplayName}'s pending invitation to ${group.data.name}?`, [{ text: 'Keep invitation', style: 'cancel' }, { text: 'Cancel invitation', style: 'destructive', onPress: () => cancel.mutate(invitation.userId) }])}>{cancel.isPending && cancel.variables === invitation.userId ? <ActivityIndicator className="text-destructive" /> : <Text>Cancel</Text>}</Button></View>}
              />
            ))}
          </Card>
        </View>
      ) : null}
      {!canManage ? <Notice title="Member changes unavailable">Only active members can invite people or cancel pending invitations.</Notice> : null}
    </Screen>
  );
}
