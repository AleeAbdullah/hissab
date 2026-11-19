import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import type { ConnectionRequest } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading, Screen, SectionLabel } from '@/components/ui';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import {
  acceptRequest,
  block,
  blocksQuery,
  cancelRequest,
  connectionsQuery,
  declineRequest,
  pendingRequestsQuery
} from '@/features/connections/api';
import { ConnectionRequestCard } from '@/features/connections/components/connection-request-card';
import { homeQuery } from '@/features/home/api';
import { isolate } from '@/i18n';

export default function RequestsScreen() {
  const { t } = useTranslation(['connections', 'common']);
  const dialog = useDialog();
  const query = useQuery(pendingRequestsQuery);
  const mutation = useMutation({
    mutationFn: ({
      action,
      id,
      userId
    }: {
      action: 'accept' | 'decline' | 'cancel' | 'block';
      id: string;
      userId?: string;
    }) =>
      action === 'accept'
        ? acceptRequest(id)
        : action === 'decline'
          ? declineRequest(id)
          : action === 'block'
            ? block(userId!)
            : cancelRequest(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: pendingRequestsQuery.queryKey
        }),
        queryClient.invalidateQueries({ queryKey: connectionsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: blocksQuery.queryKey }),
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
    dialog(
      action === 'decline' ? t('declineRequest') : t('cancelRequest2'),
      t('willNoLongerSeeThisPendingRequest', {
        name: isolate(request.personDisplayName)
      }),
      [
        { text: t('keepRequest'), style: 'cancel' },
        {
          text: action === 'decline' ? t('decline') : t('cancelRequest'),
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
          {t('noPendingFriendRequests')}
        </Text>
      ) : null}
      {incoming.length ? (
        <SectionLabel>{t('incoming', { count: incoming.length })}</SectionLabel>
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
          onBlock={() =>
            dialog(
              t('block3', { name: isolate(item.personDisplayName) }),
              t('thisDeclinesTheRequestAndStopsThemFromSendingNew'),
              [
                { text: t('common:cancel'), style: 'cancel' },
                {
                  text: t('blockPerson'),
                  style: 'destructive',
                  onPress: () =>
                    mutation.mutate({
                      action: 'block',
                      id: item.id,
                      userId: item.personUserId
                    })
                }
              ]
            )
          }
          onReport={() =>
            router.push({
              pathname: '/report',
              params: {
                targetType: 'USER',
                targetId: item.personUserId,
                name: item.personDisplayName
              }
            })
          }
        />
      ))}
      {outgoing.length ? (
        <SectionLabel>{t('outgoing', { count: outgoing.length })}</SectionLabel>
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
