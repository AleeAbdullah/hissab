import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading, Screen } from '@/components/ui';
import { profileQuery } from '@/features/account/api';
import { homeQuery } from '@/features/home/api';
import {
  PersonalTransactionEditor,
  type PersonalTransactionFormDraft
} from '@/features/personal/components/personal-transaction-editor';
import { createPersonalTransaction } from '@/features/personal/api';
import { usePersistentDraft } from '@/features/local-data/draft';

export default function PersonalTransactionScreen() {
  const profile = useQuery(profileQuery);
  const persistedDraft = usePersistentDraft<PersonalTransactionFormDraft>(
    'personal-transaction'
  );
  const create = useMutation({
    mutationFn: createPersonalTransaction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['personal'] }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      persistedDraft.clear();
      router.back();
    }
  });
  if (profile.isLoading || !persistedDraft.ready) return <Loading />;
  if (profile.error || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={profile.error ?? new Error('Profile is unavailable.')}
        />
      </Screen>
    );
  const discard = () =>
    Alert.alert(
      'Discard draft?',
      'This removes the saved personal transaction details from this device.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard draft',
          style: 'destructive',
          onPress: () => {
            persistedDraft.clear();
            router.back();
          }
        }
      ]
    );
  return (
    <Screen>
      {create.error ? <ErrorMessage error={create.error} /> : null}
      <PersonalTransactionEditor
        displayCurrency={profile.data.displayCurrency}
        saving={create.isPending}
        onSave={create.mutate}
        savedDraft={persistedDraft.draft}
        onDraftChange={persistedDraft.save}
        onDiscard={discard}
      />
    </Screen>
  );
}
