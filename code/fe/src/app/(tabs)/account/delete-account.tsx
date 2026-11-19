import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { queryClient } from '@/api/query-client';
import { clearTokens } from '@/api/session-store';
import { ErrorMessage, Field, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { deleteAccount } from '@/features/account/api';

export default function DeleteAccountScreen() {
  const { t } = useTranslation(['account', 'common']);
  const dialog = useDialog();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      deleteAccount({ currentPassword: password, confirmation: 'DELETE' }),
    onSuccess: async () => {
      queryClient.clear();
      await clearTokens();
      router.replace('/sign-in');
    }
  });
  const valid = password.length > 0 && confirmation === 'DELETE';
  const confirmDeletion = () => {
    dialog(
      t('deleteTallyStickAccount'),
      t('thisIsPermanentYourProfileIsAnonymizedAndEvery'),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: t('deleteAccount'),
          style: 'destructive',
          onPress: () => mutation.mutate()
        }
      ]
    );
  };

  return (
    <Screen>
      <Notice title={t('beforeYouCanDelete')} error>
        {t('settleEveryLedgerBalanceAndLeaveEveryActiveGroup')}
      </Notice>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field
        label={t('currentPassword')}
        secureTextEntry
        autoComplete="current-password"
        value={password}
        onChangeText={setPassword}
      />
      <Field
        label={t('typeDeleteToConfirm')}
        autoCapitalize="characters"
        value={confirmation}
        onChangeText={setConfirmation}
        error={
          confirmation.length > 0 && confirmation !== 'DELETE'
            ? t('typeDeleteExactly')
            : undefined
        }
      />
      <Button
        variant="destructive"
        disabled={!valid || mutation.isPending}
        accessibilityState={{
          disabled: !valid || mutation.isPending,
          busy: mutation.isPending
        }}
        onPress={confirmDeletion}
      >
        {mutation.isPending ? (
          <ActivityIndicator className="text-destructive-foreground" />
        ) : (
          <Text>{t('permanentlyDeleteAccount')}</Text>
        )}
      </Button>
    </Screen>
  );
}
