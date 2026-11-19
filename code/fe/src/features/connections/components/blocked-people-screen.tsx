import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Avatar,
  ErrorMessage,
  ListRow,
  Loading,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { blocksQuery, unblock } from '@/features/connections/api';
import { homeQuery } from '@/features/home/api';
import { isolate } from '@/i18n';

export function BlockedPeopleScreen() {
  const { t } = useTranslation(['connections', 'common']);
  const dialog = useDialog();
  const query = useQuery(blocksQuery);
  const mutation = useMutation({
    mutationFn: unblock,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: blocksQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ])
  });
  if (query.isLoading) return <Loading />;

  return (
    <Screen>
      {query.error || mutation.error ? (
        <ErrorMessage error={query.error ?? mutation.error} />
      ) : null}
      {query.isSuccess && !query.data.length ? (
        <Text
          selectable
          className="py-8 text-center text-[15px] leading-[22px] text-muted-foreground"
        >
          {t('noBlockedPeople')}
        </Text>
      ) : null}
      {query.data?.length ? (
        <SectionLabel>
          {t('blocked', { count: query.data.length })}
        </SectionLabel>
      ) : null}
      {query.data?.length ? (
        <View>
          {query.data.map((person, index) => (
            <ListRow
              key={person.userId}
              divided={index > 0}
              title={person.displayName}
              leading={<Avatar name={person.displayName} />}
              trailing={
                <Button
                  variant="outline"
                  size="compact"
                  accessibilityLabel={t('unblock', {
                    name: isolate(person.displayName)
                  })}
                  disabled={mutation.isPending}
                  accessibilityState={{
                    disabled: mutation.isPending,
                    busy:
                      mutation.isPending && mutation.variables === person.userId
                  }}
                  onPress={() =>
                    dialog(
                      t('unblockThisPerson'),
                      t('theyCanSendANewConnectionRequestAfterYouUnblock'),
                      [
                        { text: t('common:cancel'), style: 'cancel' },
                        {
                          text: t('unblock2'),
                          onPress: () => mutation.mutate(person.userId)
                        }
                      ]
                    )
                  }
                >
                  {mutation.isPending &&
                  mutation.variables === person.userId ? (
                    <ActivityIndicator className="text-primary" />
                  ) : (
                    <Text>{t('unblock2')}</Text>
                  )}
                </Button>
              }
            />
          ))}
        </View>
      ) : null}
      {query.data?.length ? (
        <Text selectable className="text-xs leading-4 text-muted-foreground">
          {t('unblockingDoesNotRestoreAConnectionOrResendARequest')}
        </Text>
      ) : null}
    </Screen>
  );
}
