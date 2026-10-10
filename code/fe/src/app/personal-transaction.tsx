import { useDialog } from '@/components/ui/dialog';
import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { homeQuery } from '@/features/home/api';
import {
  PersonalTransactionEditor,
  type PersonalTransactionFormDraft
} from '@/features/personal/components/personal-transaction-editor';
import { createPersonalTransaction } from '@/features/personal/api';
import { usePersistentDraft } from '@/features/local-data/draft';

export default function PersonalTransactionScreen() {
  const dialog = useDialog();
  const profile = useQuery(profileQuery);
  const persistedDraft = usePersistentDraft<PersonalTransactionFormDraft>(
    'personal-transaction'
  );
  const [liveDraft, setLiveDraft] =
    useState<PersonalTransactionFormDraft | null>(null);
  const { save: saveDraft } = persistedDraft;
  const trackDraft = useCallback(
    (draft: PersonalTransactionFormDraft | null) => {
      setLiveDraft(draft);
      saveDraft(draft);
    },
    [saveDraft]
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
  const discard = () =>
    dialog(
      'Discard draft?',
      'This removes the saved personal transaction details from this device.',
      [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            persistedDraft.clear();
            router.back();
          }
        }
      ]
    );
  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-2 px-5 pb-2 pt-5">
        <View className="min-w-20 items-start">
          {liveDraft ? (
            <Button
              variant="ghost"
              hitSlop={4}
              className="-ml-3"
              disabled={create.isPending}
              accessibilityLabel="Discard draft"
              onPress={discard}
            >
              <Text className="text-destructive">Discard</Text>
            </Button>
          ) : null}
        </View>
        <Text
          accessibilityRole="header"
          className="flex-1 text-center text-xl font-semibold"
        >
          {liveDraft?.type === 'INCOME' ? 'Add income' : 'Add expense'}
        </Text>
        <View className="min-w-20 items-end">
          <Button
            variant="ghost"
            size="icon"
            className="-mr-3"
            accessibilityLabel="Close add transaction"
            onPress={() => router.back()}
          >
            <Icon as={X} size={24} />
          </Button>
        </View>
      </View>
      {profile.isLoading || !persistedDraft.ready ? (
        <Loading />
      ) : profile.error || !profile.data ? (
        <View className="px-5">
          <ErrorMessage
            error={profile.error ?? new Error('Profile is unavailable.')}
          />
        </View>
      ) : (
        <PersonalTransactionEditor
          displayCurrency={profile.data.displayCurrency}
          error={create.error}
          saving={create.isPending}
          onSave={create.mutate}
          savedDraft={persistedDraft.draft}
          onDraftChange={trackDraft}
        />
      )}
    </View>
  );
}
