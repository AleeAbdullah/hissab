import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useState } from 'react';

import { queryClient } from '@/api/query-client';
import { Button, ErrorMessage, Field, Loading, Notice, Screen } from '@/components/ui';
import { groupQuery, groupsQuery, updateGroup } from '@/features/groups/api';

export default function EditGroupScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useQuery(groupQuery(groupId));
  const update = useMutation({
    mutationFn: (nextName: string) => updateGroup(groupId, nextName),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey }),
        queryClient.invalidateQueries({ queryKey: groupQuery(groupId).queryKey }),
      ]);
      router.back();
    },
  });

  if (group.isLoading) return <Loading />;
  if (group.error || !group.data) return <Screen><ErrorMessage error={group.error ?? new Error('Group not found.')} /></Screen>;

  const canManage = group.data.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Edit group' }} />
      {!canManage ? <Notice title="Editing unavailable">Only active members can edit an active group.</Notice> : null}
      {update.error ? <ErrorMessage error={update.error} /> : null}
      <GroupNameForm
        key={group.data.name}
        initialName={group.data.name}
        canManage={canManage}
        loading={update.isPending}
        onChange={update.reset}
        onSave={(name) => update.mutate(name)}
      />
    </Screen>
  );
}

function GroupNameForm({
  initialName,
  canManage,
  loading,
  onChange,
  onSave,
}: {
  initialName: string;
  canManage: boolean;
  loading: boolean;
  onChange: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const trimmedName = name.trim();
  const save = () => onSave(trimmedName);
  return (
    <>
      <Field
        label="Group name"
        value={name}
        onChangeText={(value) => { setName(value); onChange(); }}
        onSubmitEditing={() => canManage && trimmedName && save()}
        maxLength={100}
        editable={canManage}
        hint="Up to 100 characters"
      />
      <Button title="Save changes" loading={loading} disabled={!canManage || !trimmedName} onPress={save} />
    </>
  );
}
