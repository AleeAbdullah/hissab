import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { View } from 'react-native';

import { Avatar, Card, ErrorMessage, Loading, Notice, Row, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { userBalancesQuery } from '@/features/balances/api';
import { ledgerBalanceDescriptions } from '@/features/balances/format';
import { profileQuery } from '@/features/account/api';
import { groupMembersQuery, groupQuery } from '@/features/groups/api';
import { LedgerActivity } from '@/features/ledger/components/ledger-activity';
import { LedgerActions } from '@/features/ledger/components/ledger-actions';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useQuery(groupQuery(groupId));
  const balances = useQuery(userBalancesQuery);
  const profile = useQuery(profileQuery);
  const members = useQuery(groupMembersQuery(groupId));

  if (group.isLoading) return <Loading />;
  if (group.error || !group.data) return <Screen><ErrorMessage error={group.error ?? new Error('Group not found.')} /></Screen>;

  const canManage = group.data.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  return (
    <Screen>
      <Stack.Screen options={{ title: group.data.name }} />
      <View className="flex-row items-center gap-4 py-2">
        <Avatar name={group.data.name} large />
        <View className="flex-1 gap-0.5">
          <Text selectable className="text-2xl font-bold leading-[30px]">{group.data.name}</Text>
          <Text selectable className="text-[15px] leading-[22px] text-muted-foreground">
            {group.data.status === 'ARCHIVED' ? 'Archived group' : `${group.data.memberCount} ${group.data.memberCount === 1 ? 'member' : 'members'}`}
          </Text>
        </View>
      </View>
      {balances.error ? <ErrorMessage error={balances.error} /> : null}
      <Card>
        <Row title="Balances" subtitle={balances.isLoading || profile.isLoading ? 'Loading balance…' : balances.error || profile.error || !profile.data ? 'Balance unavailable' : ledgerBalanceDescriptions(balances.data, groupId, profile.data.displayCurrency).join(' · ') || 'No recorded balance'} href={{ pathname: '/groups/[groupId]/balances', params: { groupId } }} />
        <Row title="Members" href={{ pathname: '/groups/[groupId]/members', params: { groupId } }} />
        {canManage ? <Row title="Edit group" href={{ pathname: '/groups/[groupId]/edit', params: { groupId } }} /> : null}
        {canManage ? <Row title="Group settings" href={{ pathname: '/groups/[groupId]/settings', params: { groupId } }} /> : null}
      </Card>
      {canManage && profile.data && members.data ? <LedgerActions draft={{ ledgerId: groupId, ledgerName: group.data.name, currentUserId: profile.data.id, displayCurrency: profile.data.displayCurrency, members: members.data.filter((member) => member.status === 'ACTIVE').map((member) => ({ userId: member.userId, displayName: member.displayName })) }} /> : null}
      {group.data.status === 'ARCHIVED' ? <Notice title="Read-only group">Archived groups keep their history and cannot be changed.</Notice> : null}
      {group.data.membershipStatus === 'LEFT' ? <Notice title="You left this group">You can still view its membership history, but cannot change it.</Notice> : null}
      {members.data && profile.data ? <LedgerActivity displayCurrency={profile.data.displayCurrency} ledgerId={groupId} members={members.data.map((member) => ({ userId: member.userId, displayName: member.displayName }))} /> : null}
      {profile.error || members.error ? <ErrorMessage error={profile.error ?? members.error} /> : null}
      <Link href={{ pathname: '/groups/[groupId]/balances', params: { groupId } }} asChild><Button role="link"><Text>View group balances</Text></Button></Link>
      <Link href={{ pathname: '/groups/[groupId]/members', params: { groupId } }} asChild><Button variant="outline" role="link"><Text>View members</Text></Button></Link>
    </Screen>
  );
}
