import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Bell, Plus } from 'lucide-react-native';
import { View } from 'react-native';

import {
  Avatar,
  Card,
  ErrorMessage,
  Loading,
  Row,
  Screen
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  ListSearchButton,
  ListSearchField,
  useListSearch
} from '@/components/ui/list-search';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { userBalancesQuery } from '@/features/balances/api';
import { ledgerBalanceDescriptions } from '@/features/balances/format';
import {
  connectionsQuery,
  pendingRequestsQuery
} from '@/features/connections/api';

export default function FriendsScreen() {
  const { search, setSearch, isOpen, toggle } = useListSearch();
  const connections = useQuery(connectionsQuery);
  const requests = useQuery(pendingRequestsQuery);
  const balances = useQuery(userBalancesQuery);
  const profile = useQuery(profileQuery);
  const filtered = (connections.data ?? []).filter((friend) =>
    `${friend.displayName} ${friend.email ?? ''}`
      .toLowerCase()
      .includes(search.trim().toLowerCase())
  );

  const incomingCount = requests.isSuccess
    ? requests.data.filter(
        (request) =>
          request.direction === 'incoming' && request.status === 'PENDING'
      ).length
    : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <View className="flex-row items-center">
              <ListSearchButton
                subject="friends"
                isOpen={isOpen}
                onPress={toggle}
                disabled={connections.isLoading || profile.isLoading}
              />
              <Link href="/groups/friends/requests" asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  role="link"
                  accessibilityLabel={
                    incomingCount === undefined
                      ? 'Connection requests'
                      : `Connection requests, ${incomingCount} incoming ${incomingCount === 1 ? 'request' : 'requests'}`
                  }
                >
                  <Icon as={Bell} size={24} className="text-primary" />
                  {incomingCount ? (
                    <View
                      pointerEvents="none"
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                      className="absolute right-0 top-0 min-w-5 items-center rounded-full bg-destructive px-1"
                    >
                      <Text className="text-xs font-semibold leading-4 text-destructive-foreground">
                        {incomingCount > 99 ? '99+' : incomingCount}
                      </Text>
                    </View>
                  ) : null}
                </Button>
              </Link>
              <Link href="/connection-new" asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  role="link"
                  accessibilityLabel="Add connection"
                >
                  <Icon as={Plus} size={24} className="text-primary" />
                </Button>
              </Link>
            </View>
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
          {isOpen ? (
            <ListSearchField
              label="Search friends"
              value={search}
              onChangeText={setSearch}
            />
          ) : null}
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
                    pathname: '/groups/friends/[friendId]',
                    params: { friendId: friend.userId }
                  }}
                  leading={<Avatar name={friend.displayName} />}
                />
              ))}
            </Card>
          ) : connections.isSuccess ? (
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
          ) : null}
        </Screen>
      )}
    </>
  );
}
