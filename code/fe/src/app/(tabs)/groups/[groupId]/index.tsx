import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Text, View } from 'react-native';

import { Avatar, Button, Card, ErrorMessage, Loading, Notice, Row, Screen } from '@/components/ui';
import { userBalancesQuery } from '@/features/balances/api';
import { ledgerBalanceDescriptions } from '@/features/balances/format';
import { profileQuery } from '@/features/account/api';
import { groupMembersQuery, groupQuery } from '@/features/groups/api';
import { LedgerActivity } from '@/features/ledger/components/ledger-activity';
import { LedgerActions } from '@/features/ledger/components/ledger-actions';
import { useAppTheme } from '@/theme/theme';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useQuery(groupQuery(groupId));
  const balances = useQuery(userBalancesQuery);
  const profile = useQuery(profileQuery);
  const members = useQuery(groupMembersQuery(groupId));
  const { colors } = useAppTheme();

  if (group.isLoading) return <Loading />;
  if (group.error || !group.data) return <Screen><ErrorMessage error={group.error ?? new Error('Group not found.')} /></Screen>;

  const canManage = group.data.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  return (
    <Screen>
      <Stack.Screen options={{ title: group.data.name }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 }}>
        <Avatar name={group.data.name} large />
        <View style={{ flex: 1, gap: 2 }}>
          <Text selectable style={{ color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700' }}>{group.data.name}</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>
            {group.data.status === 'ARCHIVED' ? 'Archived group' : `${group.data.memberCount} ${group.data.memberCount === 1 ? 'member' : 'members'}`}
          </Text>
        </View>
      </View>
      {balances.error ? <ErrorMessage error={balances.error} /> : null}
      <Card>
        <Row title="Balances" subtitle={balances.isLoading ? 'Loading balance…' : balances.error ? 'Balance unavailable' : ledgerBalanceDescriptions(balances.data, groupId).join(' · ') || 'No recorded balance'} href={{ pathname: '/groups/[groupId]/balances', params: { groupId } }} />
        <Row title="Members" href={{ pathname: '/groups/[groupId]/members', params: { groupId } }} />
        {canManage ? <Row title="Edit group" href={{ pathname: '/groups/[groupId]/edit', params: { groupId } }} /> : null}
        {canManage ? <Row title="Group settings" href={{ pathname: '/groups/[groupId]/settings', params: { groupId } }} /> : null}
      </Card>
      {canManage && profile.data && members.data ? <LedgerActions draft={{ ledgerId: groupId, ledgerName: group.data.name, currentUserId: profile.data.id, defaultCurrency: profile.data.defaultCurrency, members: members.data.filter((member) => member.status === 'ACTIVE').map((member) => ({ userId: member.userId, displayName: member.displayName })) }} /> : null}
      {group.data.status === 'ARCHIVED' ? <Notice title="Read-only group">Archived groups keep their history and cannot be changed.</Notice> : null}
      {group.data.membershipStatus === 'LEFT' ? <Notice title="You left this group">You can still view its membership history, but cannot change it.</Notice> : null}
      {members.data ? <LedgerActivity ledgerId={groupId} members={members.data.map((member) => ({ userId: member.userId, displayName: member.displayName }))} /> : null}
      {profile.error || members.error ? <ErrorMessage error={profile.error ?? members.error} /> : null}
      <Button title="View group balances" href={{ pathname: '/groups/[groupId]/balances', params: { groupId } }} />
      <Button title="View members" href={{ pathname: '/groups/[groupId]/members', params: { groupId } }} secondary />
    </Screen>
  );
}
