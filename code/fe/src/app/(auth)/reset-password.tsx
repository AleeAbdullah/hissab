import { useMutation } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { Card, ErrorMessage, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text as ButtonText } from '@/components/ui/text';
import { resetPassword } from '@/features/auth/api';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';
import { AuthTextField } from '@/features/auth/components/auth-field';

export default function ResetPasswordScreen() {
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mutation = useMutation({ mutationFn: () => resetPassword(token, password) });
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid = token.length >= 32 && password.length >= 12 && password === confirm;

  if (mutation.isSuccess) {
    return <Screen><AuthPageHeader title="Password changed" /><Notice title="Sign in again">Every session has ended. Sign in again with your new password.</Notice><Link href="/sign-in" asChild><Button variant="outline" role="link"><ButtonText>Back to sign in</ButtonText></Button></Link></Screen>;
  }

  return (
    <Screen>
      <AuthPageHeader title="Set new password" description="Signing in again will be required on every device." />
      {!token ? <Notice error title="Reset token missing">Open this screen from the reset link, or request a new link.</Notice> : null}
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Card>
        <AuthTextField first label="New password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} hint="At least 12 characters." />
        <AuthTextField label="Confirm new password" secureTextEntry autoComplete="new-password" value={confirm} onChangeText={setConfirm} error={mismatch ? 'The two new passwords do not match.' : undefined} />
      </Card>
      <Button disabled={!valid || mutation.isPending} accessibilityState={{ disabled: !valid || mutation.isPending, busy: mutation.isPending }} onPress={() => mutation.mutate()}>
        {mutation.isPending ? <ActivityIndicator color="white" /> : <ButtonText>Save new password</ButtonText>}
      </Button>
      {!token ? <Link href="/forgot-password" asChild><Button variant="outline" role="link"><ButtonText>Request a new link</ButtonText></Button></Link> : null}
    </Screen>
  );
}
