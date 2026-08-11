import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { View } from 'react-native';

import { Avatar, ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { LedgerBalanceCards } from '@/features/balances/components/ledger-balance-cards';
import { profileQuery } from '@/features/account/api';
import { connectionsQuery } from '@/features/connections/api';
import { LedgerActivity } from '@/features/ledger/components/ledger-activity';
import { LedgerActions } from '@/features/ledger/components/ledger-actions';

export default function FriendDetailScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const connections = useQuery(connectionsQuery);
  const profile = useQuery(profileQuery);
  const friend = connections.data?.find((item) => item.userId === friendId);
  const balances = useQuery({ ...ledgerBalancesQuery(friend?.ledgerId ?? ''), enabled: Boolean(friend) });

  if (connections.isLoading || profile.isLoading || balances.isLoading) return <Loading />;
  if (connections.error || balances.error || profile.error || !friend || !balances.data || !profile.data) return <Screen><ErrorMessage error={connections.error ?? balances.error ?? profile.error ?? new Error('Friend ledger not found.')} /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: friend.displayName }} />
      <View className="flex-row items-center gap-4 py-2">
        <Avatar name={friend.displayName} large />
        <View className="flex-1 gap-0.5">
          <Text selectable className="text-2xl font-bold leading-[30px]">{friend.displayName}</Text>
          <Text selectable className="text-[15px] leading-[22px] text-muted-foreground">Direct ledger</Text>
        </View>
      </View>
      <SectionLabel>BALANCES</SectionLabel>
      <LedgerBalanceCards balances={balances.data} displayCurrency={profile.data.displayCurrency} />
      <LedgerActions draft={{ ledgerId: friend.ledgerId, ledgerName: friend.displayName, currentUserId: profile.data.id, displayCurrency: profile.data.displayCurrency, members: [{ userId: profile.data.id, displayName: profile.data.displayName }, { userId: friend.userId, displayName: friend.displayName }] }} />
      <LedgerActivity displayCurrency={profile.data.displayCurrency} ledgerId={friend.ledgerId} members={[{ userId: profile.data.id, displayName: profile.data.displayName }, { userId: friend.userId, displayName: friend.displayName }]} />
      <Link href={{ pathname: '/friends/[friendId]/settings', params: { friendId } }} asChild><Button variant="outline" role="link"><Text>Friend settings</Text></Button></Link>
    </Screen>
  );
}
