import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { Avatar, Button, Card, ErrorMessage, Loading, Row, Screen, SectionLabel } from '@/components/ui';
import { userBalancesQuery } from '@/features/balances/api';
import { ledgerBalanceDescriptions } from '@/features/balances/format';
import { connectionsQuery, pendingRequestsQuery } from '@/features/connections/api';
import { useAppTheme } from '@/theme/theme';

export default function FriendsScreen() {
  const { colors } = useAppTheme();
  const [search, setSearch] = useState('');
  const connections = useQuery(connectionsQuery);
  const requests = useQuery(pendingRequestsQuery);
  const balances = useQuery(userBalancesQuery);
  const filtered = useMemo(
    () => (connections.data ?? []).filter((friend) => `${friend.displayName} ${friend.email ?? ''}`.toLowerCase().includes(search.trim().toLowerCase())),
    [connections.data, search],
  );

  if (connections.isLoading) return <Loading />;

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/connection-new" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel="Add connection" style={{ minWidth: 44, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' }}>
                <Text style={{ color: colors.brand, fontSize: 30, fontWeight: '300' }}>＋</Text>
              </Pressable>
            </Link>
          ),
        }}
      />
      {connections.error || requests.error || balances.error ? <ErrorMessage error={connections.error ?? requests.error ?? balances.error} /> : null}
      <TextInput
        accessibilityLabel="Search friends"
        placeholder="Search"
        placeholderTextColor={colors.secondary}
        value={search}
        onChangeText={setSearch}
        style={{ minHeight: 44, borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 12, backgroundColor: colors.surfaceSubtle, color: colors.text, fontSize: 17 }}
      />
      <Card>
        <Row title="Connection requests" detail={requests.data?.length ? String(requests.data.length) : undefined} href="/friends/requests" />
        <Row title="Blocked people" href="/friends/blocked" />
      </Card>
      <SectionLabel>CONNECTIONS</SectionLabel>
      {filtered.length ? (
        <Card>
          {filtered.map((friend) => (
            <Row
              key={friend.userId}
              title={friend.displayName}
              subtitle={balances.isLoading ? 'Loading balance…' : balances.error ? 'Balance unavailable' : ledgerBalanceDescriptions(balances.data, friend.ledgerId).join(' · ') || 'No recorded balance'}
              href={{ pathname: '/friends/[friendId]', params: { friendId: friend.userId } }}
              leading={<Avatar name={friend.displayName} />}
            />
          ))}
        </Card>
      ) : (
        <View style={{ gap: 12, alignItems: 'stretch', paddingVertical: 24 }}>
          <Text selectable style={{ color: colors.secondary, fontSize: 17, lineHeight: 23, textAlign: 'center' }}>
            {search ? 'No connections match your search.' : 'No connections yet. Connect with someone by their exact email address.'}
          </Text>
          {!search ? <Button title="Add connection" href="/connection-new" /> : null}
        </View>
      )}
    </Screen>
  );
}
