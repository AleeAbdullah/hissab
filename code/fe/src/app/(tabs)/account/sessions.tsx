import { useMutation, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Alert, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Card, ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { revokeOtherSessions, revokeSession, sessionsQuery } from '@/features/account/api';

const date = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not yet';

export default function SessionsScreen() {
  const query = useQuery(sessionsQuery);
  const mutation = useMutation({
    mutationFn: (sessionId?: string) => sessionId ? revokeSession(sessionId) : revokeOtherSessions(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionsQuery.queryKey }),
  });
  if (query.isLoading) return <Loading />;
  const current = query.data?.find((session) => session.current);
  const others = query.data?.filter((session) => !session.current) ?? [];

  const sessionCard = (session: NonNullable<typeof current>) => (
    <Card key={session.id}>
      <View className="gap-2 p-3">
        <Text selectable className="text-[17px] font-semibold">{session.deviceName ?? session.userAgent ?? 'Unknown device'}{session.current ? ' · Current' : ''}</Text>
        <Text selectable className="text-[13px] leading-[18px] text-muted-foreground">Signed in {date(session.createdAt)} · Last used {date(session.lastUsedAt)} · Expires {date(session.expiresAt)}</Text>
        {!session.current ? <Button variant="destructiveOutline" disabled={mutation.isPending} accessibilityState={{ disabled: mutation.isPending, busy: mutation.isPending && mutation.variables === session.id }} onPress={() => Alert.alert('Revoke this session?', 'That device will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Revoke', style: 'destructive', onPress: () => mutation.mutate(session.id) }])}>{mutation.isPending && mutation.variables === session.id ? <ActivityIndicator className="text-destructive" /> : <Text>Revoke</Text>}</Button> : null}
      </View>
    </Card>
  );

  return (
    <Screen>
      {query.error || mutation.error ? <ErrorMessage error={query.error ?? mutation.error} /> : null}
      {current ? <><SectionLabel>THIS DEVICE</SectionLabel>{sessionCard(current)}</> : null}
      <SectionLabel>OTHER SESSIONS · {others.length}</SectionLabel>
      {others.map(sessionCard)}
      {others.length ? <Button variant="destructiveOutline" disabled={mutation.isPending} accessibilityState={{ disabled: mutation.isPending, busy: mutation.isPending && mutation.variables === undefined }} onPress={() => Alert.alert('Revoke all other sessions?', 'Every other device will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Revoke all', style: 'destructive', onPress: () => mutation.mutate(undefined) }])}>{mutation.isPending && mutation.variables === undefined ? <ActivityIndicator className="text-destructive" /> : <Text>Revoke all other sessions</Text>}</Button> : <Text selectable className="text-[15px] text-muted-foreground">No other active sessions.</Text>}
      <Text selectable className="text-[13px] leading-[18px] text-muted-foreground">Locations are not shown because the backend does not provide an authoritative location. Revoke any session you do not recognise and change your password.</Text>
    </Screen>
  );
}
