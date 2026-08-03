import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, Text, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { Avatar, Button, Card, ErrorMessage, Loading, Screen } from '@/components/ui';
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
      {!query.data?.length ? <Text selectable style={{ color: colors.secondary, fontSize: 17, textAlign: 'center', paddingVertical: 32 }}>No blocked people.</Text> : null}
      {query.data?.map((person) => (
        <Card key={person.userId}>
          <>
            <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={person.displayName} />
              <Text selectable style={{ flex: 1, color: colors.text, fontSize: 17 }}>{person.displayName}</Text>
            </View>
            <View style={{ padding: 12 }}>
              <Button
                title="Unblock"
                secondary
                loading={mutation.isPending && mutation.variables === person.userId}
                onPress={() => Alert.alert('Unblock this person?', 'They will be able to send a new connection request.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Unblock', onPress: () => mutation.mutate(person.userId) }])}
              />
            </View>
          </>
        </Card>
      ))}
    </Screen>
  );
}
