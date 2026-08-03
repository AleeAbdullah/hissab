import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { ComingLaterScreen } from '@/features/coming-later/screen';
import { connectionsQuery } from '@/features/connections/api';

export default function FriendDetailScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { data } = useQuery(connectionsQuery);
  const friend = data?.find((item) => item.userId === friendId);
  return (
    <>
      <Stack.Screen options={{ title: friend?.displayName ?? 'Friend' }} />
      <ComingLaterScreen
        purpose="Balances, ledger entries, settlement and reminder actions need the financial backend before they can be shown truthfully."
        links={[{ label: 'Friend settings', href: { pathname: '/friends/[friendId]/settings', params: { friendId } } }]}
      />
    </>
  );
}
