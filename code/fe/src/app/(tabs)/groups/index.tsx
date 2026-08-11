import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Button, Card, ErrorMessage, Loading, Row, Screen, SectionLabel } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { userBalancesQuery } from '@/features/balances/api';
import { ledgerBalanceDescriptions } from '@/features/balances/format';
import {
  acceptGroupInvitation,
  declineGroupInvitation,
  groupsQuery,
  incomingGroupInvitationsQuery,
} from '@/features/groups/api';
import { GroupInvitationCard } from '@/features/groups/components/group-invitation-card';
import { homeQuery } from '@/features/home/api';
import { useAppTheme } from '@/theme/theme';

export default function GroupsScreen() {
  const { colors } = useAppTheme();
  const [search, setSearch] = useState('');
  const groups = useQuery(groupsQuery);
  const invitations = useQuery(incomingGroupInvitationsQuery);
  const balances = useQuery(userBalancesQuery);
  const profile = useQuery(profileQuery);
  const resolveInvitation = useMutation({
    mutationFn: ({ groupId, response }: { groupId: string; response: 'accept' | 'decline' }) =>
      response === 'accept' ? acceptGroupInvitation(groupId) : declineGroupInvitation(groupId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: incomingGroupInvitationsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
      ]);
    },
  });
  const filtered = useMemo(
    () => (groups.data ?? []).filter((group) => group.name.toLowerCase().includes(search.trim().toLowerCase())),
    [groups.data, search],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/group-new" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel="Create group" style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Text style={{ color: colors.brand, fontSize: 30, fontWeight: '300' }}>＋</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      {groups.isLoading && invitations.isLoading ? <Loading /> : (
        <Screen>
          {groups.error || invitations.error || balances.error || profile.error || resolveInvitation.error ? <ErrorMessage error={groups.error ?? invitations.error ?? balances.error ?? profile.error ?? resolveInvitation.error} /> : null}
          {groups.data?.length ? (
            <TextInput
              accessibilityLabel="Search groups"
              placeholder="Search"
              placeholderTextColor={colors.secondary}
              value={search}
              onChangeText={setSearch}
              style={{ minHeight: 44, borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 12, backgroundColor: colors.surfaceSubtle, color: colors.text, fontSize: 17 }}
            />
          ) : null}
          {invitations.data?.length ? (
            <View style={{ gap: 12 }}>
              <SectionLabel>INVITATIONS</SectionLabel>
              {invitations.data.map((invitation) => (
                <GroupInvitationCard
                  key={invitation.groupId}
                  invitation={invitation}
                  loading={resolveInvitation.isPending && resolveInvitation.variables?.groupId === invitation.groupId}
                  onAccept={() => resolveInvitation.mutate({ groupId: invitation.groupId, response: 'accept' })}
                  onDecline={() => resolveInvitation.mutate({ groupId: invitation.groupId, response: 'decline' })}
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
                  detail={group.status === 'ARCHIVED' ? 'Archived' : group.membershipStatus === 'LEFT' ? 'Left' : undefined}
                  href={{ pathname: '/groups/[groupId]', params: { groupId: group.id } }}
                />
              ))}
            </Card>
          ) : (
            <View style={{ paddingVertical: 24 }}>
              <Text selectable style={{ color: colors.secondary, fontSize: 17, lineHeight: 23, textAlign: 'center' }}>
                {search ? 'No groups match your search.' : 'No groups yet. Create one to start a shared ledger.'}
              </Text>
              {!search ? <Button title="Create group" href="/group-new" /> : null}
            </View>
          )}
        </Screen>
      )}
    </>
  );
}
