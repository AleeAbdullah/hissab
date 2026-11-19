import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Flag, UserPlus } from 'lucide-react-native';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Avatar,
  ErrorMessage,
  ListRow,
  Loading,
  Notice,
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
import { isolate } from '@/i18n';

export default function GroupMembersScreen() {
  const { t } = useTranslation(['groups', 'common']);
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
            new Error(t('groupNotFound'))
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
          <Text>{t('retry')}</Text>
        </Button>
      </Screen>
    );

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: t('members'),
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
                  accessibilityLabel={t('inviteMembers')}
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
              <Text>{t('retryInvitations')}</Text>
            </Button>
          ) : null}
        </View>
      ) : null}
      <SectionLabel>
        {t('active', {
          count: members.data.filter((member) => member.status === 'ACTIVE')
            .length
        })}
      </SectionLabel>
      <View>
        {(members.data ?? [])
          .filter((member) => member.status === 'ACTIVE')
          .map((member, index) => (
            <ListRow
              key={member.userId}
              divided={index > 0}
              leading={<Avatar name={member.displayName} />}
              title={
                member.userId === profile.data?.id
                  ? t('you')
                  : member.displayName
              }
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
          accessibilityLabel={t('loadingInvitations')}
          className="text-primary"
        />
      ) : null}
      {canManage && invitations.data?.length ? (
        <SectionLabel>{t('pendingInvitations')}</SectionLabel>
      ) : null}
      <View>
        {canManage &&
          invitations.data?.map((invitation, index) => (
            <ListRow
              key={invitation.userId}
              divided={index > 0}
              title={invitation.userDisplayName}
              leading={<Avatar name={invitation.userDisplayName} />}
              subtitle={t('invitedBy', {
                name: isolate(invitation.invitedByDisplayName)
              })}
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
                        t('cancelInvitation'),
                        t('removeSPendingInvitationTo', {
                          name: isolate(invitation.userDisplayName),
                          group: isolate(group.data.name)
                        }),
                        [
                          { text: t('keepInvitation'), style: 'cancel' },
                          {
                            text: t('cancelInvitation2'),
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
                      <Text>{t('common:cancel')}</Text>
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
          <SectionLabel>{t('pendingInvitations')}</SectionLabel>
          <View>
            {members.data
              .filter((member) => member.status === 'INVITED')
              .map((member, index) => (
                <ListRow
                  key={member.userId}
                  divided={index > 0}
                  leading={<Avatar name={member.displayName} />}
                  title={member.displayName}
                  subtitle={t('invited')}
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
        <SectionLabel>{t('past')}</SectionLabel>
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
          .map((member, index) => (
            <ListRow
              key={member.userId}
              divided={index > 0}
              leading={<Avatar name={member.displayName} />}
              title={member.displayName}
              subtitle={
                member.status === 'CANCELLED'
                  ? t('invitationCancelled')
                  : member.status === 'DECLINED'
                    ? t('declinedInvitation')
                    : t('left')
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
            <Text>{t('inviteMember')}</Text>
          </Button>
        </Link>
      ) : null}
      {!canManage ? (
        <Notice title={t('memberChangesUnavailable')}>
          {t('thisGroupIsReadOnlyInvitationsCannotBeChanged')}
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
  const { t } = useTranslation(['groups', 'common']);
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
          className="w-12 px-0"
          variant="ghost"
          role="link"
          accessibilityLabel={t('report', { name: isolate(name) })}
        >
          <Icon as={Flag} size={20} className="text-muted-foreground" />
        </Button>
      </Link>
    </View>
  );
}
