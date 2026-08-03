import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Avatar, Button, Card, ErrorMessage, Field, Screen } from '@/components/ui';
import { connectionsQuery, findCandidate, pendingRequestsQuery, sendRequest } from '@/features/connections/api';
import { useAppTheme } from '@/theme/use-app-theme';

export default function NewConnectionScreen() {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const lookup = useMutation({ mutationFn: findCandidate });
  const send = useMutation({
    mutationFn: sendRequest,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pendingRequestsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: connectionsQuery.queryKey }),
      ]);
    },
  });
  const candidate = lookup.data;

  return (
    <Screen>
      <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 20 }}>Enter the exact email address. Hissab does not expose a searchable people directory.</Text>
      {lookup.error || send.error ? <ErrorMessage error={lookup.error ?? send.error} /> : null}
      <Field
        label="Email"
        placeholder="person@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={(value) => { setEmail(value); lookup.reset(); send.reset(); }}
        onSubmitEditing={() => email.includes('@') && lookup.mutate(email.trim().toLowerCase())}
      />
      <Button title={lookup.isPending ? 'Looking up…' : 'Find person'} disabled={!email.includes('@')} loading={lookup.isPending} onPress={() => lookup.mutate(email.trim().toLowerCase())} />
      {lookup.isSuccess && !candidate ? <Text selectable style={{ color: colors.secondary, fontSize: 17, textAlign: 'center', paddingVertical: 24 }}>No connection available.</Text> : null}
      {candidate ? (
        <Card>
          <View style={{ padding: 16, gap: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={candidate.displayName} />
              <View style={{ flex: 1 }}>
                <Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{candidate.displayName}</Text>
                <Text selectable style={{ color: colors.secondary, fontSize: 13 }}>{candidate.email}</Text>
              </View>
            </View>
            {candidate.state === 'AVAILABLE' && !send.isSuccess ? <Button title={send.isPending ? 'Sending…' : 'Send connection request'} loading={send.isPending} onPress={() => send.mutate(candidate.userId)} /> : null}
            {send.isSuccess || candidate.state === 'PENDING_OUTGOING' ? <Text selectable style={{ color: colors.positive, fontSize: 15 }}>Connection request pending.</Text> : null}
            {candidate.state === 'PENDING_INCOMING' ? <Button title="Review incoming request" href="/friends/requests" secondary /> : null}
            {candidate.state === 'CONNECTED' ? <Button title="View friend" href={{ pathname: '/friends/[friendId]', params: { friendId: candidate.userId } }} secondary /> : null}
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}
