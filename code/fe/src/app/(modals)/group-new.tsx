import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';

import { queryClient } from '@/api/query-client';
import { Button, ErrorMessage, Field, Screen } from '@/components/ui';
import { createGroup, groupsQuery } from '@/features/groups/api';
import { homeQuery } from '@/features/home/api';

export default function NewGroupScreen() {
  const [name, setName] = useState('');
  const create = useMutation({
    mutationFn: createGroup,
    onSuccess: async (group) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey }),
      ]);
      router.replace({ pathname: '/groups/[groupId]', params: { groupId: group.id } });
    },
  });
  const trimmedName = name.trim();

  return (
    <Screen>
      {create.error ? <ErrorMessage error={create.error} /> : null}
      <Field
        label="Group name"
        placeholder="e.g. Weekend trip"
        value={name}
        onChangeText={(value) => { setName(value); create.reset(); }}
        onSubmitEditing={() => trimmedName && create.mutate(trimmedName)}
        maxLength={100}
        autoFocus
        hint="Up to 100 characters"
      />
      <Button title="Create group" loading={create.isPending} disabled={!trimmedName} onPress={() => create.mutate(trimmedName)} />
    </Screen>
  );
}
