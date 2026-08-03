import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Button, ErrorMessage, Screen } from '@/components/ui';
import { connectionsQuery, findCandidate, pendingRequestsQuery, sendRequest } from '@/features/connections/api';
import { ConnectionCandidateCard } from '@/features/connections/components/connection-candidate-card';
import { useAppTheme } from '@/theme/theme';

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
      <View style={{ gap: 8 }}>
        <Text selectable style={{ color: colors.text, fontSize: 20, lineHeight: 25, fontWeight: '600' }}>Find someone</Text>
        <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>Search by the exact email address on their account. Hissab does not list or suggest people.</Text>
      </View>
      {lookup.error || send.error ? <ErrorMessage error={lookup.error ?? send.error} /> : null}
      <TextInput
        accessibilityLabel="Email address"
        placeholder="person@example.com"
        placeholderTextColor={colors.secondary}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={(value) => { setEmail(value); lookup.reset(); send.reset(); }}
        onSubmitEditing={() => email.includes('@') && lookup.mutate(email.trim().toLowerCase())}
        style={{ minHeight: 48, borderRadius: 12, borderCurve: 'continuous', paddingHorizontal: 16, backgroundColor: colors.surfaceSubtle, color: colors.text, fontSize: 16, lineHeight: 24 }}
      />
      <Button title={lookup.isPending ? 'Looking up…' : 'Find person'} disabled={!email.includes('@')} loading={lookup.isPending} onPress={() => lookup.mutate(email.trim().toLowerCase())} />
      {lookup.isSuccess && !candidate ? <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22, textAlign: 'center', paddingVertical: 24 }}>No connection is available for that email. Check the spelling or confirm the email with them.</Text> : null}
      {candidate ? (
        <ConnectionCandidateCard candidate={candidate} isSending={send.isPending} requestSent={send.isSuccess} onSend={() => send.mutate(candidate.userId)} />
      ) : null}
    </Screen>
  );
}
