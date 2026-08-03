import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Text, View } from 'react-native';

import { Avatar, Button, Card, Notice, Screen } from '@/components/ui';
import { connectionsQuery } from '@/features/connections/api';
import { useAppTheme } from '@/theme/theme';

export default function FriendSettingsScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const { data } = useQuery(connectionsQuery);
  const friend = data?.find((item) => item.userId === friendId);
  const { colors } = useAppTheme();

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Friend settings' }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 8 }}>
        <Avatar name={friend?.displayName ?? 'Friend'} large />
        <View style={{ flex: 1, gap: 2 }}>
          <Text selectable style={{ color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '700' }}>{friend?.displayName ?? 'Friend'}</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>{friend ? 'Active connection' : 'Connection details unavailable'}</Text>
        </View>
      </View>
      <Card>
        <View style={{ padding: 16, gap: 4 }}>
          <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 }}>RELATIONSHIP</Text>
          <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{friend ? 'Direct connection is active.' : 'Open this page from your Friends list.'}</Text>
        </View>
      </Card>
      <Notice title="Blocking is unavailable">Hissab needs authoritative balances before it can explain the consequences of blocking this person.</Notice>
      <Button title="View blocked people" href="/friends/blocked" secondary />
    </Screen>
  );
}
