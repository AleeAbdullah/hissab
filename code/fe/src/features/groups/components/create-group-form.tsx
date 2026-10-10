import { useMutation } from '@tanstack/react-query';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { ActivityIndicator, useWindowDimensions } from 'react-native';

import { queryClient } from '@/api/query-client';
import type { Group } from '@/api/contracts';
import { ErrorMessage, Field, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
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
  const [name, setName] = useState('');
  const submitting = useRef(false);
  const created = useRef(false);
  const navigation = useNavigation();
  const { fontScale } = useWindowDimensions();
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
    <>
      <Stack.Screen
        options={{
          gestureEnabled: !busy,
          sheetInitialDetentIndex: fontScale >= 1.3 ? 1 : 0,
          headerRight: () => (
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              accessibilityLabel="Close create group"
              accessibilityState={{ disabled: busy }}
              onPress={cancel}
            >
              <Icon as={X} size={24} className="text-primary" />
            </Button>
          )
        }}
      />
      <Screen>
        {create.error ? <ErrorMessage error={create.error} /> : null}
        <Field
          label="Group name"
          placeholder="e.g. Weekend trip"
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
          hint="Up to 100 characters"
        />
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
          <Text>{busy ? 'Creating…' : 'Create group'}</Text>
        </Button>
      </Screen>
    </>
  );
}
