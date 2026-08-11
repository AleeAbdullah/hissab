import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';

import { queryClient } from '@/api/query-client';
import { clearTokens } from '@/api/session-store';
import { ErrorMessage, Field, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { deleteAccount } from '@/features/account/api';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const mutation = useMutation({
    mutationFn: () => deleteAccount({ currentPassword: password, confirmation: 'DELETE' }),
    onSuccess: async () => {
      queryClient.clear();
      await clearTokens();
      router.replace('/sign-in');
    },
  });
  const valid = password.length > 0 && confirmation === 'DELETE';
  const confirmDeletion = () => {
    Alert.alert(
      'Delete Hissab account?',
      'This is permanent. Your profile is anonymized and every device is signed out. Financial history remains for audit.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete account', style: 'destructive', onPress: () => mutation.mutate() },
      ],
    );
  };

  return (
    <Screen>
      <Notice title="Before you can delete" error>Settle every ledger balance and leave every active group. This action cannot be undone.</Notice>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field label="Current password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} />
      <Field label="Type DELETE to confirm" autoCapitalize="characters" value={confirmation} onChangeText={setConfirmation} error={confirmation.length > 0 && confirmation !== 'DELETE' ? 'Type DELETE exactly.' : undefined} />
      <Button variant="destructive" disabled={!valid || mutation.isPending} accessibilityState={{ disabled: !valid || mutation.isPending, busy: mutation.isPending }} onPress={confirmDeletion}>{mutation.isPending ? <ActivityIndicator className="text-destructive-foreground" /> : <Text>Permanently delete account</Text>}</Button>
    </Screen>
  );
}
