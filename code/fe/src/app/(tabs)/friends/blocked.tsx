import { useMutation, useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Alert, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Avatar, Card, ErrorMessage, Loading, Row, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { blocksQuery, unblock } from '@/features/connections/api';
import { homeQuery } from '@/features/home/api';

export default function BlockedScreen() {
  const query = useQuery(blocksQuery);
  const mutation = useMutation({
    mutationFn: unblock,
    onSuccess: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: blocksQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
    ]),
  });
  if (query.isLoading) return <Loading />;

  return (
    <Screen>
      {query.error || mutation.error ? <ErrorMessage error={query.error ?? mutation.error} /> : null}
      {!query.data?.length ? <Text selectable className="py-8 text-center text-[15px] leading-[22px] text-muted-foreground">No blocked people.</Text> : null}
      {query.data?.length ? <SectionLabel>BLOCKED · {query.data.length}</SectionLabel> : null}
      {query.data?.length ? (
        <Card>
          {query.data.map((person) => (
            <Row
              key={person.userId}
              title={person.displayName}
              subtitle="Blocked"
              leading={<Avatar name={person.displayName} />}
              trailing={<View className="w-[104px]"><Button variant="outline" disabled={mutation.isPending} accessibilityState={{ disabled: mutation.isPending, busy: mutation.isPending && mutation.variables === person.userId }} onPress={() => Alert.alert('Unblock this person?', 'They can send a new connection request after you unblock them.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Unblock', onPress: () => mutation.mutate(person.userId) }])}>{mutation.isPending && mutation.variables === person.userId ? <ActivityIndicator className="text-primary" /> : <Text>Unblock</Text>}</Button></View>}
            />
          ))}
        </Card>
      ) : null}
      <Text selectable className="text-xs leading-4 text-muted-foreground">Unblocking does not restore a connection or resend a request.</Text>
    </Screen>
  );
}
