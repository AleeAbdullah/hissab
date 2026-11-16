import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Plus, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

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
import { profileQuery } from '@/features/account/api';
import { userBalancesQuery } from '@/features/balances/api';
import {
  NetBalance,
  netBalanceLabel
} from '@/features/balances/components/net-balance';
import {
  connectionsQuery,
  pendingRequestsQuery
} from '@/features/connections/api';

export default function FriendsScreen() {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();
  const connections = useQuery(connectionsQuery);
  const requests = useQuery(pendingRequestsQuery);
  const balances = useQuery(userBalancesQuery);
  const profile = useQuery(profileQuery);
  const currency = profile.data?.displayCurrency;
  const filtered = (connections.data ?? []).filter((friend) =>
    `${friend.displayName} ${friend.email ?? ''}`.toLowerCase().includes(query)
  );
  const pending = (requests.data ?? []).filter(
    (request) => request.status === 'PENDING'
  );
  const incoming = pending.filter(
    (request) => request.direction === 'incoming'
  ).length;
  const sent = pending.length - incoming;
  const requestSummary = [
    incoming ? `${incoming} waiting for you` : null,
    sent ? `${sent} sent` : null
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: 'Search',
            placement: 'stacked',
            hideWhenScrolling: false,
            autoCapitalize: 'none',
            onChangeText: (event) => setSearch(event.nativeEvent.text)
          },
          headerRight: () => (
            <Link href="/connection-new" asChild>
              <Button
                className="w-12 px-0"
                variant="ghost"
                role="link"
                accessibilityLabel="Add friend"
              >
                <Icon as={Plus} size={24} className="text-primary" />
              </Button>
            </Link>
          )
        }}
      />
      {connections.isLoading || profile.isLoading ? (
        <Loading />
      ) : (
        <Screen>
          {connections.error ||
          requests.error ||
          balances.error ||
          profile.error ? (
            <ErrorMessage
              error={
                connections.error ??
                requests.error ??
                balances.error ??
                profile.error
              }
            />
          ) : null}
          {pending.length && !query ? (
            <ListRow
              href="/groups/friends/requests"
              title="Requests"
              subtitle={requestSummary}
              accessibilityLabel={`Friend requests, ${requestSummary}`}
              leading={<IconTile icon={UserPlus} />}
              trailing={
                incoming ? (
                  <View className="min-w-6 items-center rounded-full bg-primary px-2 py-0.5">
                    <Text className="text-xs font-semibold leading-4 text-primary-foreground">
                      {incoming > 99 ? '99+' : incoming}
                    </Text>
                  </View>
                ) : null
              }
            />
          ) : null}
          {filtered.length ? (
            <View className="gap-1">
              <SectionLabel>DIRECT BALANCES</SectionLabel>
              <View>
                {filtered.map((friend, index) => {
                  // A ledger with no records is absent from balances, so it is settled.
                  const netMinor = balances.data
                    ? (balances.data.ledgers.find(
                        (ledger) => ledger.ledgerId === friend.ledgerId
                      )?.netMinor ?? '0')
                    : undefined;
                  return (
                    <ListRow
                      key={friend.userId}
                      title={friend.displayName}
                      subtitle={friend.email ?? undefined}
                      divided={index > 0}
                      accessibilityLabel={[
                        friend.displayName,
                        friend.email,
                        netBalanceLabel(netMinor, currency)
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      href={{
                        pathname: '/groups/friends/[friendId]',
                        params: {
                          friendId: friend.userId,
                          ledgerId: friend.ledgerId
                        }
                      }}
                      leading={<Avatar name={friend.displayName} />}
                      trailing={
                        <NetBalance netMinor={netMinor} currency={currency} />
                      }
                    />
                  );
                })}
              </View>
              <Text
                selectable
                className="pt-2 text-[13px] leading-[18px] text-muted-foreground"
              >
                Group balances aren’t included.
              </Text>
            </View>
          ) : connections.isSuccess ? (
            <View className="items-stretch gap-3 py-6">
              <Text
                selectable
                className="text-center text-[17px] leading-[23px] text-muted-foreground"
              >
                {query
                  ? 'No friends match your search.'
                  : 'No friends yet. Add someone by the exact email address on their account.'}
              </Text>
              {!query ? (
                <Link href="/connection-new" asChild>
                  <Button role="link">
                    <Text>Add friend</Text>
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
