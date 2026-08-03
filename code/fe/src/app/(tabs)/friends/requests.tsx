import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import type { ConnectionRequest } from '@/api/contracts';
import { Avatar, Button, Card, ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { acceptRequest, cancelRequest, connectionsQuery, declineRequest, pendingRequestsQuery } from '@/features/connections/api';
import { useAppTheme } from '@/theme/theme';

export default function RequestsScreen() {
  const { colors } = useAppTheme();
  const query = useQuery(pendingRequestsQuery);
  const mutation = useMutation({
    mutationFn: ({ action, id }: { action: 'accept' | 'decline' | 'cancel'; id: string }) =>
      action === 'accept' ? acceptRequest(id) : action === 'decline' ? declineRequest(id) : cancelRequest(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: pendingRequestsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: connectionsQuery.queryKey }),
      ]);
    },
  });
  if (query.isLoading) return <Loading />;

  const incoming = query.data?.filter((item) => item.direction === 'incoming') ?? [];
  const outgoing = query.data?.filter((item) => item.direction === 'outgoing') ?? [];
  const confirm = (request: ConnectionRequest, action: 'decline' | 'cancel') =>
    Alert.alert(
      action === 'decline' ? 'Decline request?' : 'Cancel request?',
      `${request.personDisplayName} will no longer see this pending request.`,
      [{ text: 'Keep', style: 'cancel' }, { text: action === 'decline' ? 'Decline' : 'Cancel request', style: 'destructive', onPress: () => mutation.mutate({ action, id: request.id }) }],
    );

  return (
    <Screen>
      {query.error || mutation.error ? <ErrorMessage error={query.error ?? mutation.error} /> : null}
      {!incoming.length && !outgoing.length ? <Text selectable style={{ color: colors.secondary, fontSize: 17, textAlign: 'center', paddingVertical: 32 }}>No pending connection requests.</Text> : null}
      {incoming.length ? <SectionLabel>RECEIVED</SectionLabel> : null}
      {incoming.map((item) => (
        <Card key={item.id}>
          <View style={{ padding: 12, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={item.personDisplayName} />
              <View style={{ flex: 1 }}><Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{item.personDisplayName}</Text><Text selectable style={{ color: colors.secondary, fontSize: 13 }}>{item.personEmail}</Text></View>
            </View>
            <Button title="Accept" loading={mutation.isPending && mutation.variables?.id === item.id} onPress={() => mutation.mutate({ action: 'accept', id: item.id })} />
            <Button title="Decline" secondary destructive disabled={mutation.isPending} onPress={() => confirm(item, 'decline')} />
          </View>
        </Card>
      ))}
      {outgoing.length ? <SectionLabel>SENT</SectionLabel> : null}
      {outgoing.map((item) => (
        <Card key={item.id}>
          <View style={{ padding: 12, gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={item.personDisplayName} />
              <View style={{ flex: 1 }}><Text selectable style={{ color: colors.text, fontSize: 17, fontWeight: '600' }}>{item.personDisplayName}</Text><Text selectable style={{ color: colors.secondary, fontSize: 13 }}>{item.personEmail}</Text></View>
            </View>
            <Button title="Cancel request" secondary destructive disabled={mutation.isPending} onPress={() => confirm(item, 'cancel')} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}
