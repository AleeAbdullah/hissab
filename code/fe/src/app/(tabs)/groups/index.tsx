import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Card,
  ErrorMessage,
  Loading,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { userBalancesQuery } from '@/features/balances/api';
import { ledgerBalanceDescriptions } from '@/features/balances/format';
import {
  acceptGroupInvitation,
  declineGroupInvitation,
  groupsQuery,
  incomingGroupInvitationsQuery
} from '@/features/groups/api';
import { GroupInvitationCard } from '@/features/groups/components/group-invitation-card';
import { homeQuery } from '@/features/home/api';

export default function GroupsScreen() {
  const [search, setSearch] = useState('');
  const groups = useQuery(groupsQuery);
  const invitations = useQuery(incomingGroupInvitationsQuery);
  const balances = useQuery(userBalancesQuery);
  const profile = useQuery(profileQuery);
  const resolveInvitation = useMutation({
    mutationFn: ({
      groupId,
      response
    }: {
      groupId: string;
      response: 'accept' | 'decline';
    }) =>
      response === 'accept'
        ? acceptGroupInvitation(groupId)
        : declineGroupInvitation(groupId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey }),
        queryClient.invalidateQueries({
          queryKey: incomingGroupInvitationsQuery.queryKey
        }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
    }
  });
  const filtered = (groups.data ?? []).filter((group) =>
    group.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/group-new" asChild>
              <Button
                variant="ghost"
                size="icon"
                role="link"
                accessibilityLabel="Create group"
              >
                <Text className="text-[30px] font-light text-primary">＋</Text>
              </Button>
            </Link>
          )
        }}
      />
      {groups.isLoading && invitations.isLoading ? (
        <Loading />
      ) : (
        <Screen>
          {groups.error ||
          invitations.error ||
          balances.error ||
          profile.error ||
          resolveInvitation.error ? (
            <ErrorMessage
              error={
                groups.error ??
                invitations.error ??
                balances.error ??
                profile.error ??
                resolveInvitation.error
              }
            />
          ) : null}
          {groups.data?.length ? (
            <TextInput
              accessibilityLabel="Search groups"
              placeholder="Search"
              value={search}
              onChangeText={setSearch}
              className="min-h-11 rounded-xl bg-muted px-3 text-[17px] text-foreground placeholder:text-muted-foreground"
            />
          ) : null}
          {invitations.data?.length ? (
            <View className="gap-3">
              <SectionLabel>INVITATIONS</SectionLabel>
              {invitations.data.map((invitation) => (
                <GroupInvitationCard
                  key={invitation.groupId}
                  invitation={invitation}
                  loading={
                    resolveInvitation.isPending &&
                    resolveInvitation.variables?.groupId === invitation.groupId
                  }
                  onAccept={() =>
                    resolveInvitation.mutate({
                      groupId: invitation.groupId,
                      response: 'accept'
                    })
                  }
                  onDecline={() =>
                    resolveInvitation.mutate({
                      groupId: invitation.groupId,
                      response: 'decline'
                    })
                  }
                />
              ))}
            </View>
          ) : null}
          <SectionLabel>GROUPS</SectionLabel>
          {filtered.length ? (
            <Card>
              {filtered.map((group) => (
                <Row
                  key={group.id}
                  title={group.name}
                  subtitle={`${group.memberCount} ${group.memberCount === 1 ? 'member' : 'members'} · ${balances.isLoading || profile.isLoading ? 'Loading balance…' : balances.error || profile.error || !profile.data ? 'Balance unavailable' : ledgerBalanceDescriptions(balances.data, group.id, profile.data.displayCurrency).join(' · ') || 'No recorded balance'}`}
                  detail={
                    group.status === 'ARCHIVED'
                      ? 'Archived'
                      : group.membershipStatus === 'LEFT'
                        ? 'Left'
                        : undefined
                  }
                  href={{
                    pathname: '/groups/[groupId]',
                    params: { groupId: group.id }
                  }}
                />
              ))}
            </Card>
          ) : (
            <View className="py-6">
              <Text
                selectable
                className="text-center text-[17px] leading-[23px] text-muted-foreground"
              >
                {search
                  ? 'No groups match your search.'
                  : 'No groups yet. Create one to start a shared ledger.'}
              </Text>
              {!search ? (
                <Link href="/group-new" asChild>
                  <Button role="link">
                    <Text>Create group</Text>
                  </Button>
                </Link>
              ) : null}
            </View>
          )}
        </Screen>
      )}
    </>
  );
}
