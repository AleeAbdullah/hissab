import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import type { ConnectionRequest } from '@/api/contracts';
import { ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { Text } from '@/components/ui/text';
import {
  acceptRequest,
  cancelRequest,
  connectionsQuery,
  declineRequest,
  pendingRequestsQuery
} from '@/features/connections/api';
import { ConnectionRequestCard } from '@/features/connections/components/connection-request-card';
import { homeQuery } from '@/features/home/api';

export default function RequestsScreen() {
  const query = useQuery(pendingRequestsQuery);
  const mutation = useMutation({
    mutationFn: ({
      action,
      id
    }: {
      action: 'accept' | 'decline' | 'cancel';
      id: string;
    }) =>
      action === 'accept'
        ? acceptRequest(id)
        : action === 'decline'
          ? declineRequest(id)
          : cancelRequest(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: pendingRequestsQuery.queryKey
        }),
        queryClient.invalidateQueries({ queryKey: connectionsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
    }
  });
  if (query.isLoading) return <Loading />;

  const incoming =
    query.data?.filter((item) => item.direction === 'incoming') ?? [];
  const outgoing =
    query.data?.filter((item) => item.direction === 'outgoing') ?? [];
  const confirm = (request: ConnectionRequest, action: 'decline' | 'cancel') =>
    Alert.alert(
      action === 'decline' ? 'Decline request?' : 'Cancel request?',
      `${request.personDisplayName} will no longer see this pending request.`,
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: action === 'decline' ? 'Decline' : 'Cancel request',
          style: 'destructive',
          onPress: () => mutation.mutate({ action, id: request.id })
        }
      ]
    );

  return (
    <Screen>
      {query.error || mutation.error ? (
        <ErrorMessage error={query.error ?? mutation.error} />
      ) : null}
      {!incoming.length && !outgoing.length ? (
        <Text
          selectable
          className="py-8 text-center text-[17px] text-muted-foreground"
        >
          No pending connection requests.
        </Text>
      ) : null}
      {incoming.length ? (
        <SectionLabel>INCOMING · {incoming.length}</SectionLabel>
      ) : null}
      {incoming.map((item) => (
        <ConnectionRequestCard
          key={item.id}
          request={item}
          disabled={mutation.isPending}
          loading={mutation.isPending && mutation.variables?.id === item.id}
          onAccept={() => mutation.mutate({ action: 'accept', id: item.id })}
          onDecline={() => confirm(item, 'decline')}
          onCancel={() => confirm(item, 'cancel')}
        />
      ))}
      {outgoing.length ? (
        <SectionLabel>OUTGOING · {outgoing.length}</SectionLabel>
      ) : null}
      {outgoing.map((item) => (
        <ConnectionRequestCard
          key={item.id}
          request={item}
          disabled={mutation.isPending}
          loading={mutation.isPending && mutation.variables?.id === item.id}
          onAccept={() => mutation.mutate({ action: 'accept', id: item.id })}
          onDecline={() => confirm(item, 'decline')}
          onCancel={() => confirm(item, 'cancel')}
        />
      ))}
    </Screen>
  );
}
