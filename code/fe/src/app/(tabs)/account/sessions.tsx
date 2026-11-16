import { useMutation, useQuery } from '@tanstack/react-query';
import { Smartphone } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  ErrorMessage,
  IconTile,
  ListRow,
  Loading,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import {
  revokeOtherSessions,
  revokeSession,
  sessionsQuery
} from '@/features/account/api';
import {
  isActiveSession,
  sessionDeviceLabel
} from '@/features/account/sessions';
import { formatDate, formatDateTime } from '@/lib/dates';

export default function SessionsScreen() {
  const dialog = useDialog();
  const query = useQuery(sessionsQuery);
  const mutation = useMutation({
    mutationFn: (sessionId?: string) =>
      sessionId ? revokeSession(sessionId) : revokeOtherSessions(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: sessionsQuery.queryKey })
  });
  if (query.isLoading) return <Loading />;
  const current = query.data?.find((session) => session.current);
  const others =
    query.data?.filter(
      (session) => !session.current && isActiveSession(session)
    ) ?? [];

  const sessionRow = (session: NonNullable<typeof current>, index: number) => (
    <ListRow
      key={session.id}
      divided={index > 0}
      leading={<IconTile icon={Smartphone} />}
      title={sessionDeviceLabel(session)}
      subtitle={`Active ${formatDateTime(session.lastUsedAt ?? session.createdAt)}`}
      trailing={
        session.current ? undefined : (
          <Button
            variant="destructiveOutline"
            size="compact"
            accessibilityLabel={`Revoke ${sessionDeviceLabel(session)}`}
            disabled={mutation.isPending}
            accessibilityState={{
              disabled: mutation.isPending,
              busy: mutation.isPending && mutation.variables === session.id
            }}
            onPress={() =>
              dialog(
                'Revoke this session?',
                'That device will need to sign in again.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Revoke',
                    style: 'destructive',
                    onPress: () => mutation.mutate(session.id)
                  }
                ]
              )
            }
          >
            {mutation.isPending && mutation.variables === session.id ? (
              <ActivityIndicator className="text-destructive" />
            ) : (
              <Text>Revoke</Text>
            )}
          </Button>
        )
      }
    >
      <Text
        selectable
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        Signed in {formatDate(session.createdAt, false)} · Expires{' '}
        {formatDate(session.expiresAt, false)}
        {session.deviceName || !session.userAgent
          ? ''
          : `\n${session.userAgent}`}
      </Text>
    </ListRow>
  );

  return (
    <Screen>
      {query.error || mutation.error ? (
        <ErrorMessage error={query.error ?? mutation.error} />
      ) : null}
      {current ? (
        <>
          <SectionLabel>THIS DEVICE</SectionLabel>
          <View>{sessionRow(current, 0)}</View>
        </>
      ) : null}
      <SectionLabel>OTHER SESSIONS · {others.length}</SectionLabel>
      {others.length ? <View>{others.map(sessionRow)}</View> : null}
      {others.length ? (
        <Button
          variant="destructiveOutline"
          disabled={mutation.isPending}
          accessibilityState={{
            disabled: mutation.isPending,
            busy: mutation.isPending && mutation.variables === undefined
          }}
          onPress={() =>
            dialog(
              'Revoke all other sessions?',
              'Every other device will need to sign in again.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Revoke all',
                  style: 'destructive',
                  onPress: () => mutation.mutate(undefined)
                }
              ]
            )
          }
        >
          {mutation.isPending && mutation.variables === undefined ? (
            <ActivityIndicator className="text-destructive" />
          ) : (
            <Text>Revoke all other sessions</Text>
          )}
        </Button>
      ) : (
        <Text selectable className="text-[15px] text-muted-foreground">
          No other active sessions.
        </Text>
      )}
    </Screen>
  );
}
