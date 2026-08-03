import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Button, Card, ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { revokeOtherSessions, revokeSession, sessionsQuery } from '@/features/account/api';
import { useAppTheme } from '@/theme/use-app-theme';

const date = (value: string | null) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Not yet';

export default function SessionsScreen() {
  const { colors } = useAppTheme();
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
      <View style={{ padding: 12, gap: 8 }}>
        <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{session.deviceName ?? session.userAgent ?? 'Unknown device'}{session.current ? ' · Current' : ''}</Text>
        <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>Signed in {date(session.createdAt)} · Last used {date(session.lastUsedAt)} · Expires {date(session.expiresAt)}</Text>
        {!session.current ? <Button title="Revoke" secondary destructive loading={mutation.isPending && mutation.variables === session.id} onPress={() => Alert.alert('Revoke this session?', 'That device will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Revoke', style: 'destructive', onPress: () => mutation.mutate(session.id) }])} /> : null}
      </View>
    </Card>
  );

  return (
    <Screen>
      {query.error || mutation.error ? <ErrorMessage error={query.error ?? mutation.error} /> : null}
      {current ? <><SectionLabel>THIS DEVICE</SectionLabel>{sessionCard(current)}</> : null}
      <SectionLabel>OTHER SESSIONS · {others.length}</SectionLabel>
      {others.map(sessionCard)}
      {others.length ? <Button title="Revoke all other sessions" secondary destructive loading={mutation.isPending && mutation.variables === undefined} onPress={() => Alert.alert('Revoke all other sessions?', 'Every other device will need to sign in again.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Revoke all', style: 'destructive', onPress: () => mutation.mutate(undefined) }])} /> : <Text selectable style={{ color: colors.secondary, fontSize: 15 }}>No other active sessions.</Text>}
      <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>Locations are not shown because the backend does not provide an authoritative location. Revoke any session you do not recognise and change your password.</Text>
    </Screen>
  );
}
