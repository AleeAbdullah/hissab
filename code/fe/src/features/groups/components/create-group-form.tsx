import { useMutation } from '@tanstack/react-query';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  View,
  useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Group } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { ErrorMessage, Field } from '@/components/ui';
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
  const [name, setName] = useState('');
  const submitting = useRef(false);
  const created = useRef(false);
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(
    () => Keyboard.metrics()?.height ?? 0
  );
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
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
          headerShown: false,
          sheetAllowedDetents: 'fitToContents'
        }}
      />
      <SafeAreaView
        edges={['bottom']}
        className="bg-background"
        style={{ maxHeight: Math.max(200, height - keyboardHeight - 48) }}
      >
        <View className="flex-row items-center justify-between gap-3 px-5 pt-4">
          <Text
            accessibilityRole="header"
            className="flex-1 text-xl font-semibold"
          >
            New group
          </Text>
          <Button variant="ghost" disabled={busy} onPress={cancel}>
            <Text>Cancel</Text>
          </Button>
        </View>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          style={{ flexGrow: 0, flexShrink: 1 }}
          contentContainerClassName="gap-4 p-5"
        >
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
            hint={
              trimmedName
                ? 'Up to 100 characters'
                : 'Enter a group name to continue. Up to 100 characters.'
            }
          />
        </ScrollView>
        <View className="px-5 pb-5">
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
        </View>
      </SafeAreaView>
    </>
  );
}
