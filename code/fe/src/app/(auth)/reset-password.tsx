import { useMutation } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button, ErrorMessage, Field, Notice, Screen } from '@/components/ui';
import { resetPassword } from '@/features/auth/api';
import { useAppTheme } from '@/theme/use-app-theme';

export default function ResetPasswordScreen() {
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const { colors } = useAppTheme();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mutation = useMutation({ mutationFn: () => resetPassword(token, password) });
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = token.length >= 32 && password.length >= 12 && password === confirm;

  if (mutation.isSuccess) {
    return <Screen><Notice title="Password changed">Every session has ended. Sign in again with your new password.</Notice><Button title="Back to sign in" href="/sign-in" /></Screen>;
  }

  return (
    <Screen>
      <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 20 }}>Signing in again will be required on every device.</Text>
      {!token ? <Notice error title="Reset token missing">Open this screen from the reset link, or request a new link.</Notice> : null}
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field label="New password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} hint="At least 12 characters." />
      <Field label="Confirm new password" secureTextEntry autoComplete="new-password" value={confirm} onChangeText={setConfirm} error={mismatch ? 'The two new passwords do not match.' : undefined} />
      <Button title={mutation.isPending ? 'Saving…' : 'Save new password'} disabled={!valid} loading={mutation.isPending} onPress={() => mutation.mutate()} />
      {!token ? <Button title="Request a new link" href="/forgot-password" secondary /> : null}
    </Screen>
  );
}
