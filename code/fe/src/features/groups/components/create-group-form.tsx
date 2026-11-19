import { useMutation } from '@tanstack/react-query';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import type { Group } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ErrorMessage, Field, FormSheet, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { createGroup, groupsQuery } from '@/features/groups/api';
import { homeQuery } from '@/features/home/api';

export function CreateGroupForm({
  onCancel,
  onCreated
}: {
  onCancel: () => void;
  onCreated: (group: Group) => void;
}) {
  const { t } = useTranslation(['groups', 'common']);
  const [name, setName] = useState('');
  const submitting = useRef(false);
  const created = useRef(false);
  const navigation = useNavigation();
  const create = useMutation({
    mutationFn: createGroup,
    onSuccess: async (group) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: ['activity'] })
      ]);
      created.current = true;
      onCreated(group);
    },
    onSettled: () => {
      submitting.current = false;
    }
  });
  // A submitted request must finish before the sheet can be dismissed.
  // Permit the successful navigation even while onSuccess is completing.
  usePreventRemove(create.isPending, ({ data }) => {
    if (created.current) navigation.dispatch(data.action);
  });
  const busy = create.isPending || create.isSuccess;
  const trimmedName = name.trim();
  const submit = () => {
    if (
      !trimmedName ||
      trimmedName.length > 100 ||
      submitting.current ||
      created.current
    )
      return;
    submitting.current = true;
    create.mutate(trimmedName);
  };
  const cancel = () => {
    if (!submitting.current && !created.current) onCancel();
  };

  return (
    <FormSheet
      title={t('newGroup')}
      action={{ label: t('common:cancel'), onPress: cancel, disabled: busy }}
    >
      <Stack.Screen options={{ gestureEnabled: !busy }} />
      <Screen
        footer={
          <Button
            disabled={!trimmedName || busy}
            accessibilityState={{
              disabled: !trimmedName || busy,
              busy
            }}
            onPress={submit}
          >
            {busy ? (
              <ActivityIndicator className="text-primary-foreground" />
            ) : null}
            <Text>{busy ? t('creating') : t('createGroup')}</Text>
          </Button>
        }
      >
        {create.error ? <ErrorMessage error={create.error} /> : null}
        <Field
          label={t('groupName')}
          placeholder={t('eGWeekendTrip')}
          value={name}
          editable={!busy}
          onChangeText={(value) => {
            if (submitting.current) return;
            setName(value);
            create.reset();
          }}
          onSubmitEditing={submit}
          returnKeyType="done"
          maxLength={100}
          autoFocus
          hint={
            trimmedName
              ? t('upTo100Characters')
              : t('enterAGroupNameToContinueUpTo100Characters')
          }
        />
      </Screen>
    </FormSheet>
  );
}
