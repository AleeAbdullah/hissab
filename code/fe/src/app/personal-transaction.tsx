import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useNavigation, usePreventRemove } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { X } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';

import { queryClient } from '@/api/query-client';
import { ErrorMessage, Loading } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { homeQuery } from '@/features/home/api';
import { usePersistentDraft } from '@/features/local-data/draft';
import { createPersonalTransaction } from '@/features/personal/api';
import {
  PersonalTransactionEditor,
  type PersonalTransactionFormDraft
} from '@/features/personal/components/personal-transaction-editor';

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
  const navigation = useNavigation();
  const allowExit = useRef(false);
  const create = useMutation({
    mutationFn: createPersonalTransaction,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['personal'] }),
        queryClient.invalidateQueries({ queryKey: homeQuery.queryKey })
      ]);
      persistedDraft.clear();
      allowExit.current = true;
      router.back();
    }
  });
  // Keep the sheet open while saving so the result can't navigate another screen.
  usePreventRemove(create.isPending, ({ data }) => {
    if (allowExit.current) navigation.dispatch(data.action);
  });
  const discard = () =>
    dialog(
      'Discard draft?',
      'This removes the saved personal transaction details from this device.',
      [
        { text: 'Keep editing', style: 'cancel' },
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
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ gestureEnabled: !create.isPending }} />
      <View className="gap-1 px-5 pb-2 pt-5">
        <View className="relative min-h-12 justify-center">
          <Text
            accessibilityRole="header"
            className="px-14 text-center text-xl font-semibold"
          >
            {liveDraft?.type === 'INCOME' ? 'Add income' : 'Add expense'}
          </Text>
          <Button
            variant="ghost"
            className="absolute right-0 w-12 px-0"
            disabled={create.isPending}
            accessibilityLabel="Close add transaction"
            onPress={() => router.back()}
          >
            <Icon as={X} size={24} />
          </Button>
        </View>
        {liveDraft ? (
          <View className="items-start">
            <Button
              variant="ghost"
              size="compact"
              className="px-0"
              disabled={create.isPending}
              accessibilityLabel="Discard draft"
              onPress={discard}
            >
              <Text className="text-destructive">Discard draft</Text>
            </Button>
          </View>
        ) : null}
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
