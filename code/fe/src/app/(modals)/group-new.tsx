import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Field, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text as ButtonText } from '@/components/ui/text';
import { createGroup, groupsQuery } from '@/features/groups/api';
import { homeQuery } from '@/features/home/api';

export default function NewGroupScreen() {
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: createGroup,
    onSuccess: async (group) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      router.replace({
        pathname: '/groups/[groupId]',
        params: { groupId: group.id }
      });
    }
  });
  const trimmedName = name.trim();

  return (
    <Screen>
      {create.error ? <ErrorMessage error={create.error} /> : null}
      <Field
        label="Group name"
        placeholder="e.g. Weekend trip"
        value={name}
        onChangeText={(value) => {
          setName(value);
          create.reset();
        }}
        onSubmitEditing={() => trimmedName && create.mutate(trimmedName)}
        maxLength={100}
        autoFocus
        hint="Up to 100 characters"
      />
      <Button
        disabled={!trimmedName || create.isPending}
        accessibilityState={{
          disabled: !trimmedName || create.isPending,
          busy: create.isPending
        }}
        onPress={() => create.mutate(trimmedName)}
      >
        {create.isPending ? (
          <ActivityIndicator color="white" />
        ) : (
          <ButtonText>Create group</ButtonText>
        )}
      </Button>
    </Screen>
  );
}
