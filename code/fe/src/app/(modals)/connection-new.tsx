import { useMutation } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ApiError } from '@/api/transport';
import { ErrorMessage, Field, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  connectionsQuery,
  findCandidate,
  pendingRequestsQuery,
  sendRequest
} from '@/features/connections/api';
import { ConnectionCandidateCard } from '@/features/connections/components/connection-candidate-card';
import { DiscoveryFeedback } from '@/features/connections/components/discovery-feedback';
import { homeQuery } from '@/features/home/api';

export default function NewConnectionScreen() {
  const [email, setEmail] = useState('');
  const searching = useRef(false);
  const sending = useRef(false);
  const lookup = useMutation({
    mutationFn: findCandidate,
    onSettled: () => {
      searching.current = false;
    }
  });
  const send = useMutation({
    mutationFn: sendRequest,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: pendingRequestsQuery.queryKey
        }),
        queryClient.invalidateQueries({ queryKey: connectionsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['activity'] })
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409)
        lookup.mutate(email.trim().toLowerCase());
    },
    onSettled: () => {
      sending.current = false;
    }
  });
  const normalizedEmail = email.trim().toLowerCase();
  const busy = lookup.isPending || send.isPending;
  const canSearch = normalizedEmail.includes('@') && !busy;
  const candidate =
    lookup.variables === normalizedEmail ? lookup.data : undefined;
  const search = () => {
    if (!canSearch || searching.current || sending.current) return;
    searching.current = true;
    send.reset();
    lookup.mutate(normalizedEmail);
  };

  return (
    <Screen>
      <View className="gap-2">
        <Text
          selectable
          className="text-[15px] leading-[22px] text-muted-foreground"
        >
          Search by the exact email address on their account. Tally Stick does
          not list or suggest people.
        </Text>
      </View>
      {send.error ? <ErrorMessage error={send.error} /> : null}
      <Field
        autoFocus
        label="Email address"
        placeholder="person@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        maxLength={254}
        editable={!busy}
        value={email}
        onChangeText={(value) => {
          setEmail(value);
          lookup.reset();
          send.reset();
        }}
        onSubmitEditing={search}
        returnKeyType="search"
      />
      <Button
        disabled={!canSearch}
        accessibilityState={{
          disabled: !canSearch,
          busy: lookup.isPending
        }}
        onPress={search}
      >
        {lookup.isPending ? (
          <ActivityIndicator className="text-primary-foreground" />
        ) : (
          <Text>Find person</Text>
        )}
      </Button>
      {lookup.isSuccess &&
      lookup.variables === normalizedEmail &&
      !candidate ? (
        <DiscoveryFeedback />
      ) : null}
      {lookup.error ? <DiscoveryFeedback error onRetry={search} /> : null}
      {!lookup.isPending && candidate ? (
        <ConnectionCandidateCard
          candidate={candidate}
          isSending={busy}
          requestSent={send.isSuccess && send.variables === candidate.userId}
          onSend={() => {
            if (
              busy ||
              sending.current ||
              searching.current ||
              candidate.state !== 'AVAILABLE' ||
              send.isSuccess
            )
              return;
            sending.current = true;
            send.mutate(candidate.userId);
          }}
        />
      ) : null}
    </Screen>
  );
}
