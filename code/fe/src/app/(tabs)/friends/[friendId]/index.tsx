import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Text, View } from 'react-native';

import { Avatar, Button, ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { LedgerBalanceCards } from '@/features/balances/components/ledger-balance-cards';
import { profileQuery } from '@/features/account/api';
import { connectionsQuery } from '@/features/connections/api';
import { LedgerActivity } from '@/features/ledger/components/ledger-activity';
import { LedgerActions } from '@/features/ledger/components/ledger-actions';
import { useAppTheme } from '@/theme/theme';

export default function FriendDetailScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const connections = useQuery(connectionsQuery);
  const profile = useQuery(profileQuery);
  const friend = connections.data?.find((item) => item.userId === friendId);
  const balances = useQuery({ ...ledgerBalancesQuery(friend?.ledgerId ?? ''), enabled: Boolean(friend) });
  const { colors } = useAppTheme();

  if (connections.isLoading || profile.isLoading || balances.isLoading) return <Loading />;
  if (connections.error || balances.error || profile.error || !friend || !balances.data || !profile.data) return <Screen><ErrorMessage error={connections.error ?? balances.error ?? profile.error ?? new Error('Friend ledger not found.')} /></Screen>;

  return (
    <Screen>
      <Stack.Screen options={{ title: friend.displayName }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 }}>
        <Avatar name={friend.displayName} large />
        <View style={{ flex: 1, gap: 2 }}>
          <Text selectable style={{ color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700' }}>{friend.displayName}</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>Direct ledger</Text>
        </View>
      </View>
      <SectionLabel>BALANCES BY CURRENCY</SectionLabel>
      <LedgerBalanceCards balances={balances.data} />
      <LedgerActions draft={{ ledgerId: friend.ledgerId, ledgerName: friend.displayName, currentUserId: profile.data.id, defaultCurrency: profile.data.defaultCurrency, members: [{ userId: profile.data.id, displayName: profile.data.displayName }, { userId: friend.userId, displayName: friend.displayName }] }} />
      <LedgerActivity ledgerId={friend.ledgerId} members={[{ userId: profile.data.id, displayName: profile.data.displayName }, { userId: friend.userId, displayName: friend.displayName }]} />
      <Button title="Friend settings" href={{ pathname: '/friends/[friendId]/settings', params: { friendId } }} secondary />
    </Screen>
  );
}
