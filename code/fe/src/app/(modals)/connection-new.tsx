import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { connectionsQuery, findCandidate, pendingRequestsQuery, sendRequest } from '@/features/connections/api';
import { ConnectionCandidateCard } from '@/features/connections/components/connection-candidate-card';
import { homeQuery } from '@/features/home/api';

export default function NewConnectionScreen() {
  const [email, setEmail] = useState('');
  const lookup = useMutation({ mutationFn: findCandidate });
  const send = useMutation({
    mutationFn: sendRequest,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pendingRequestsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: connectionsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
      ]);
    },
  });
  const candidate = lookup.data;

  return (
    <Screen>
      <View className="gap-2">
        <Text selectable className="text-xl font-semibold leading-[25px]">Find someone</Text>
        <Text selectable className="text-[15px] leading-[22px] text-muted-foreground">Search by the exact email address on their account. Hissab does not list or suggest people.</Text>
      </View>
      {lookup.error || send.error ? <ErrorMessage error={lookup.error ?? send.error} /> : null}
      <TextInput
        accessibilityLabel="Email address"
        placeholder="person@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={(value) => { setEmail(value); lookup.reset(); send.reset(); }}
        onSubmitEditing={() => email.includes('@') && lookup.mutate(email.trim().toLowerCase())}
        className="min-h-12 rounded-xl bg-muted px-4 text-base leading-6 text-foreground placeholder:text-muted-foreground"
      />
      <Button disabled={!email.includes('@') || lookup.isPending} accessibilityState={{ disabled: !email.includes('@') || lookup.isPending, busy: lookup.isPending }} onPress={() => lookup.mutate(email.trim().toLowerCase())}>
        {lookup.isPending ? <ActivityIndicator className="text-primary-foreground" /> : <Text>Find person</Text>}
      </Button>
      {lookup.isSuccess && !candidate ? <Text selectable className="py-6 text-center text-[15px] leading-[22px] text-muted-foreground">No connection is available for that email. Check the spelling or confirm the email with them.</Text> : null}
      {candidate ? (
        <ConnectionCandidateCard candidate={candidate} isSending={send.isPending} requestSent={send.isSuccess} onSend={() => send.mutate(candidate.userId)} />
      ) : null}
    </Screen>
  );
}
