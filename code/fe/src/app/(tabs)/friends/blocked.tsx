import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Avatar, Button, Card, ErrorMessage, Loading, Row, Screen, SectionLabel } from '@/components/ui';
import { blocksQuery, unblock } from '@/features/connections/api';
import { useAppTheme } from '@/theme/theme';

export default function BlockedScreen() {
  const { colors } = useAppTheme();
  const query = useQuery(blocksQuery);
  const mutation = useMutation({
    mutationFn: unblock,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: blocksQuery.queryKey }),
  });
  if (query.isLoading) return <Loading />;

  return (
    <Screen>
      {query.error || mutation.error ? <ErrorMessage error={query.error ?? mutation.error} /> : null}
      {!query.data?.length ? <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22, textAlign: 'center', paddingVertical: 32 }}>No blocked people.</Text> : null}
      {query.data?.length ? <SectionLabel>BLOCKED · {query.data.length}</SectionLabel> : null}
      {query.data?.length ? (
        <Card>
          {query.data.map((person) => (
            <Row
              key={person.userId}
              title={person.displayName}
              subtitle="Blocked"
              leading={<Avatar name={person.displayName} />}
              trailing={<View style={{ width: 92 }}><Button title="Unblock" secondary loading={mutation.isPending && mutation.variables === person.userId} onPress={() => Alert.alert('Unblock this person?', 'They can send a new connection request after you unblock them.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Unblock', onPress: () => mutation.mutate(person.userId) }])} /></View>}
            />
          ))}
        </Card>
      ) : null}
      <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16 }}>Unblocking does not restore a connection or resend a request.</Text>
    </Screen>
  );
}
