import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { UsersRound } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { DisplayCurrency, Group, UserBalances } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { Icons } from '@/components/icons';
import {
  Avatar,
  ErrorMessage,
  IconTile,
  ListRow,
  Loading,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  notificationInboxQueryKey,
  profileQuery
} from '@/features/account/api';
import { userBalancesQuery } from '@/features/balances/api';
import {
  NetBalance,
  netBalanceLabel
} from '@/features/balances/components/net-balance';
import { connectionsQuery } from '@/features/connections/api';
import {
  acceptGroupInvitation,
  declineGroupInvitation,
  groupsQuery,
  incomingGroupInvitationsQuery
} from '@/features/groups/api';
import { GroupInvitationCard } from '@/features/groups/components/group-invitation-card';
import { homeQuery } from '@/features/home/api';
import { isolate } from '@/i18n';

export default function GroupsScreen() {
  const { t } = useTranslation(['groups', 'common']);
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const groups = useQuery(groupsQuery);
  const invitations = useQuery(incomingGroupInvitationsQuery);
  const balances = useQuery(userBalancesQuery);
  const profile = useQuery(profileQuery);
  const connections = useQuery(connectionsQuery);
  const resolving = useRef(false);
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
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: userBalancesQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['activity'] }),
        queryClient.invalidateQueries({ queryKey: notificationInboxQueryKey })
      ]);
    },
    onSettled: () => {
      resolving.current = false;
    }
  });
  const respond = (groupId: string, response: 'accept' | 'decline') => {
    if (resolving.current) return;
    resolving.current = true;
    resolveInvitation.mutate({ groupId, response });
  };
  const filtered = (groups.data ?? []).filter((group) =>
    group.name.toLowerCase().includes(query)
  );
  const past = filtered.filter(
    (group) => group.status === 'ARCHIVED' || group.membershipStatus === 'LEFT'
  );
  const active = filtered.filter((group) => !past.includes(group));
  const friendCount = connections.data?.length;
  const groupRows = (list: Group[]) =>
    list.map((group, index) => (
      <GroupRow
        key={group.id}
        group={group}
        balances={balances.data}
        currency={profile.data?.displayCurrency}
        divided={index > 0}
      />
    ));

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: t('searchGroups'),
            placement: 'stacked',
            hideWhenScrolling: false,
            autoCapitalize: 'none',
            onChangeText: (event) => setSearch(event.nativeEvent.text)
          },
          headerRight: () => (
            <Link href="/group-new" asChild>
              <Button
                className="w-12 px-0"
                variant="ghost"
                role="link"
                accessibilityLabel={t('createGroup')}
              >
                <Icon as={Icons.add} size={24} className="text-primary" />
              </Button>
            </Link>
          )
        }}
      />
      {groups.isLoading || invitations.isLoading ? (
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
          {/* Stays visible while searching, so people are still one tap away. */}
          <ListRow
            href="/groups/friends"
            title={t('friends')}
            subtitle={
              friendCount === undefined
                ? undefined
                : t('friendCount', { count: friendCount })
            }
            accessibilityLabel={
              friendCount === undefined
                ? t('friends')
                : t('friendsCountLabel', { count: friendCount })
            }
            leading={<IconTile icon={UsersRound} />}
          />
          {invitations.data?.length ? (
            <View className="gap-3">
              <SectionLabel>{t('invitations')}</SectionLabel>
              {invitations.data.map((invitation) => (
                <GroupInvitationCard
                  key={invitation.groupId}
                  invitation={invitation}
                  disabled={resolveInvitation.isPending}
                  loading={
                    resolveInvitation.isPending &&
                    resolveInvitation.variables?.groupId === invitation.groupId
                  }
                  onAccept={() => respond(invitation.groupId, 'accept')}
                  onDecline={() => respond(invitation.groupId, 'decline')}
                />
              ))}
            </View>
          ) : null}
          {filtered.length ? (
            <>
              {active.length ? (
                <View className="gap-1">
                  <SectionLabel>{t('groups2')}</SectionLabel>
                  <View>{groupRows(active)}</View>
                </View>
              ) : null}
              {past.length ? (
                <View className="gap-1">
                  <SectionLabel>{t('pastGroups')}</SectionLabel>
                  <View>{groupRows(past)}</View>
                </View>
              ) : null}
            </>
          ) : groups.isSuccess ? (
            <View className="py-6">
              <Text
                selectable
                className="text-center text-[17px] leading-[23px] text-muted-foreground"
              >
                {search
                  ? t('noGroupsMatchYourSearch')
                  : t('noGroupsYetCreateOneToStartASharedLedger')}
              </Text>
              {!search ? (
                <Link href="/group-new" asChild>
                  <Button role="link">
                    <Text>{t('createGroup')}</Text>
                  </Button>
                </Link>
              ) : null}
            </View>
          ) : null}
        </Screen>
      )}
    </>
  );
}

function GroupRow({
  group,
  balances,
  currency,
  divided
}: {
  group: Group;
  balances?: UserBalances;
  currency?: DisplayCurrency;
  divided: boolean;
}) {
  const { t } = useTranslation(['groups', 'common']);
  const netMinor = balances?.ledgers.find(
    (ledger) => ledger.ledgerId === group.id
  )?.netMinor;
  const subtitle = t(
    group.status === 'ARCHIVED'
      ? 'archivedMembers'
      : group.membershipStatus === 'LEFT'
        ? 'leftMembers'
        : 'memberCount',
    { count: group.memberCount }
  );
  return (
    <ListRow
      href={{ pathname: '/groups/[groupId]', params: { groupId: group.id } }}
      title={group.name}
      subtitle={subtitle}
      divided={divided}
      accessibilityLabel={t('rowLabel', {
        name: isolate(group.name),
        summary: isolate(subtitle),
        balance: isolate(netBalanceLabel(netMinor, currency) ?? '')
      })}
      leading={<Avatar name={group.name} />}
      trailing={<NetBalance netMinor={netMinor} currency={currency} />}
    />
  );
}
