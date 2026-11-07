import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { UserPlus } from 'lucide-react-native';
import { useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Avatar,
  ErrorMessage,
  Loading,
  Notice,
  Row,
  SectionLabel,
  Screen
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import {
  cancelGroupInvitation,
  groupInvitationsQuery,
  groupMembersQuery,
  groupQuery
} from '@/features/groups/api';

export default function GroupMembersScreen() {
  const dialog = useDialog();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const cancelling = useRef(false);
  const group = useQuery(groupQuery(groupId));
  const members = useQuery(groupMembersQuery(groupId));
  const profile = useQuery(profileQuery);
  const canManage =
    group.data?.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  const invitations = useQuery({
    ...groupInvitationsQuery(groupId),
    enabled: canManage
  });
  const cancel = useMutation({
    mutationFn: (userId: string) => cancelGroupInvitation(groupId, userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups', groupId] }),
        queryClient.invalidateQueries({ queryKey: ['group-invitations'] }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] })
      ]);
    },
    onSettled: () => {
      cancelling.current = false;
    }
  });

  if (group.isLoading || members.isLoading || profile.isLoading)
    return <Loading />;
  if (
    group.error ||
    members.error ||
    profile.error ||
    !group.data ||
    !members.data ||
    !profile.data
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            group.error ??
            members.error ??
            profile.error ??
            new Error('Group not found.')
          }
        />
        <Button
          variant="outline"
          onPress={() => {
            void group.refetch();
            void members.refetch();
            void profile.refetch();
          }}
        >
          <Text>Retry</Text>
        </Button>
      </Screen>
    );

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: 'Members',
          headerRight: () =>
            canManage ? (
              <Link
                href={{
                  pathname: '/groups/[groupId]/invite',
                  params: { groupId }
                }}
                asChild
              >
                <Button
                  className="w-12 px-0"
                  variant="ghost"
                  role="link"
                  accessibilityLabel="Invite members"
                >
                  <Icon as={UserPlus} size={22} className="text-primary" />
                </Button>
              </Link>
            ) : null
        }}
      />
      {invitations.error || cancel.error ? (
        <View className="gap-2">
          <ErrorMessage error={invitations.error ?? cancel.error} />
          {invitations.error ? (
            <Button variant="outline" onPress={() => invitations.refetch()}>
              <Text>Retry invitations</Text>
            </Button>
          ) : null}
        </View>
      ) : null}
      <SectionLabel>
        ACTIVE ·{' '}
        {
          (members.data ?? []).filter((member) => member.status === 'ACTIVE')
            .length
        }
      </SectionLabel>
      <View>
        {(members.data ?? [])
          .filter((member) => member.status === 'ACTIVE')
          .map((member) => (
            <Row
              key={member.userId}
              leading={<Avatar name={member.displayName} />}
              title={`${member.displayName}${member.userId === profile.data?.id ? ' (you)' : ''}`}
              trailing={
                member.userId === profile.data?.id ? undefined : (
                  <ReportMemberButton
                    userId={member.userId}
                    name={member.displayName}
                  />
                )
              }
            />
          ))}
      </View>
      {canManage && invitations.isLoading ? (
        <ActivityIndicator
          accessibilityLabel="Loading invitations"
          className="text-primary"
        />
      ) : null}
      {canManage && invitations.data?.length ? (
        <SectionLabel>PENDING INVITATIONS</SectionLabel>
      ) : null}
      <View>
        {canManage &&
          invitations.data?.map((invitation) => (
            <Row
              key={invitation.userId}
              title={invitation.userDisplayName}
              leading={<Avatar name={invitation.userDisplayName} />}
              subtitle={`Invited by ${invitation.invitedByDisplayName}`}
              trailing={
                <View className="shrink-0">
                  <Button
                    size="compact"
                    variant="destructiveOutline"
                    disabled={!canManage || cancel.isPending}
                    accessibilityState={{
                      disabled: !canManage || cancel.isPending,
                      busy:
                        cancel.isPending &&
                        cancel.variables === invitation.userId
                    }}
                    onPress={() =>
                      dialog(
                        'Cancel invitation?',
                        `Remove ${invitation.userDisplayName}'s pending invitation to ${group.data.name}?`,
                        [
                          { text: 'Keep invitation', style: 'cancel' },
                          {
                            text: 'Cancel invitation',
                            style: 'destructive',
                            onPress: () => {
                              if (!canManage || cancelling.current) return;
                              cancelling.current = true;
                              cancel.mutate(invitation.userId);
                            }
                          }
                        ]
                      )
                    }
                  >
                    {cancel.isPending &&
                    cancel.variables === invitation.userId ? (
                      <ActivityIndicator className="text-destructive" />
                    ) : (
                      <Text>Cancel</Text>
                    )}
                  </Button>
                </View>
              }
            />
          ))}
      </View>
      {(!canManage || !invitations.isSuccess) &&
      members.data.some((member) => member.status === 'INVITED') ? (
        <>
          <SectionLabel>PENDING INVITATIONS</SectionLabel>
          <View>
            {members.data
              .filter((member) => member.status === 'INVITED')
              .map((member) => (
                <Row
                  key={member.userId}
                  leading={<Avatar name={member.displayName} />}
                  title={member.displayName}
                  subtitle="Invited"
                />
              ))}
          </View>
        </>
      ) : null}
      {(members.data ?? []).some(
        (member) =>
          member.status !== 'ACTIVE' &&
          member.status !== 'INVITED' &&
          !invitations.data?.some(
            (invitation) => invitation.userId === member.userId
          )
      ) ? (
        <SectionLabel>PAST</SectionLabel>
      ) : null}
      <View>
        {(members.data ?? [])
          .filter(
            (member) =>
              member.status !== 'ACTIVE' &&
              member.status !== 'INVITED' &&
              !invitations.data?.some(
                (invitation) => invitation.userId === member.userId
              )
          )
          .map((member) => (
            <Row
              key={member.userId}
              leading={<Avatar name={member.displayName} />}
              title={member.displayName}
              subtitle={
                member.status === 'CANCELLED'
                  ? 'Invitation cancelled'
                  : member.status === 'DECLINED'
                    ? 'Declined invitation'
                    : 'Left'
              }
              trailing={
                member.status === 'LEFT' &&
                member.userId !== profile.data?.id ? (
                  <ReportMemberButton
                    userId={member.userId}
                    name={member.displayName}
                  />
                ) : undefined
              }
            />
          ))}
      </View>
      {canManage &&
      invitations.isSuccess &&
      !invitations.data.length &&
      (members.data ?? []).filter((member) => member.status === 'ACTIVE')
        .length === 1 ? (
        <Link
          href={{ pathname: '/groups/[groupId]/invite', params: { groupId } }}
          asChild
        >
          <Button role="link">
            <Text>Invite member</Text>
          </Button>
        </Link>
      ) : null}
      {!canManage ? (
        <Notice title="Member changes unavailable">
          This group is read-only. Invitations cannot be changed.
        </Notice>
      ) : null}
    </Screen>
  );
}

function ReportMemberButton({
  userId,
  name
}: {
  userId: string;
  name: string;
}) {
  return (
    <View className="shrink-0">
      <Link
        href={{
          pathname: '/report',
          params: { targetType: 'USER', targetId: userId, name }
        }}
        asChild
      >
        <Button
          size="compact"
          variant="outline"
          role="link"
          accessibilityLabel={`Report ${name}`}
        >
          <Text>Report</Text>
        </Button>
      </Link>
    </View>
  );
}
