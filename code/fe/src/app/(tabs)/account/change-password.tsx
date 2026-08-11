import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { ErrorMessage, Field, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text as ButtonText } from '@/components/ui/text';
import { changePassword } from '@/features/auth/api';

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mutation = useMutation({ mutationFn: () => changePassword(current, password), onSuccess: () => router.replace('/sign-in') });
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = current.length > 0 && password.length >= 12 && password === confirm;

  return (
    <Screen>
      <Notice title="Every device will be signed out">Changing your password ends every session, including this one. You will return to Sign in.</Notice>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field label="Current password" secureTextEntry autoComplete="current-password" value={current} onChangeText={setCurrent} />
      <Field label="New password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} hint="At least 12 characters. Longer beats complicated." />
      <Field label="Confirm new password" secureTextEntry autoComplete="new-password" value={confirm} onChangeText={setConfirm} error={mismatch ? 'The two new passwords do not match.' : undefined} />
      <Button disabled={!valid || mutation.isPending} accessibilityState={{ disabled: !valid || mutation.isPending, busy: mutation.isPending }} onPress={() => mutation.mutate()}>{mutation.isPending ? <ActivityIndicator color="white" /> : <ButtonText>Change password</ButtonText>}</Button>
    </Screen>
  );
}
