import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import {
  Avatar,
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
  connectionsQuery,
  pendingRequestsQuery
} from '@/features/connections/api';

export default function FriendsScreen() {
  const [search, setSearch] = useState('');
  const connections = useQuery(connectionsQuery);
  const requests = useQuery(pendingRequestsQuery);
  const balances = useQuery(userBalancesQuery);
  const profile = useQuery(profileQuery);
  const filtered = (connections.data ?? []).filter((friend) =>
    `${friend.displayName} ${friend.email ?? ''}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  if (connections.isLoading || profile.isLoading) return <Loading />;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/connection-new" asChild>
              <Button
                variant="ghost"
                size="icon"
                role="link"
                accessibilityLabel="Add connection"
              >
                <Text className="text-[30px] font-light text-primary">＋</Text>
              </Button>
            </Link>
          )
        }}
      />
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
      <TextInput
        accessibilityLabel="Search friends"
        placeholder="Search"
        value={search}
        onChangeText={setSearch}
        className="min-h-11 rounded-xl bg-muted px-3 text-[17px] text-foreground placeholder:text-muted-foreground"
      />
      <Card>
        <Row
          title="Connection requests"
          detail={
            requests.data?.length ? String(requests.data.length) : undefined
          }
          href="/friends/requests"
        />
        <Row title="Blocked people" href="/friends/blocked" />
      </Card>
      <SectionLabel>CONNECTIONS</SectionLabel>
      {filtered.length ? (
        <Card>
          {filtered.map((friend) => (
            <Row
              key={friend.userId}
              title={friend.displayName}
              subtitle={
                balances.isLoading || profile.isLoading
                  ? 'Loading balance…'
                  : balances.error || profile.error || !profile.data
                    ? 'Balance unavailable'
                    : ledgerBalanceDescriptions(
                        balances.data,
                        friend.ledgerId,
                        profile.data.displayCurrency
                      ).join(' · ') || 'No recorded balance'
              }
              href={{
                pathname: '/friends/[friendId]',
                params: { friendId: friend.userId }
              }}
              leading={<Avatar name={friend.displayName} />}
            />
          ))}
        </Card>
      ) : (
        <View className="items-stretch gap-3 py-6">
          <Text
            selectable
            className="text-center text-[17px] leading-[23px] text-muted-foreground"
          >
            {search
              ? 'No connections match your search.'
              : 'No connections yet. Connect with someone by their exact email address.'}
          </Text>
          {!search ? (
            <Link href="/connection-new" asChild>
              <Button role="link">
                <Text>Add connection</Text>
              </Button>
            </Link>
          ) : null}
        </View>
      )}
    </Screen>
  );
}
