import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading, Screen } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { homeQuery } from '@/features/home/api';
import { PersonalTransactionEditor } from '@/features/personal/components/personal-transaction-editor';
import { createPersonalTransaction } from '@/features/personal/api';

export default function PersonalTransactionScreen() {
  const profile = useQuery(profileQuery);
  const create = useMutation({
    mutationFn: createPersonalTransaction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['personal'] }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      router.back();
    }
  });
  if (profile.isLoading) return <Loading />;
  if (profile.error || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={profile.error ?? new Error('Profile is unavailable.')}
        />
      </Screen>
    );
  return (
    <Screen>
      {create.error ? <ErrorMessage error={create.error} /> : null}
      <PersonalTransactionEditor
        displayCurrency={profile.data.displayCurrency}
        saving={create.isPending}
        onSave={create.mutate}
      />
    </Screen>
  );
}
