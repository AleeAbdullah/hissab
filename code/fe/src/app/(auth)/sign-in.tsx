import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { Button, ErrorMessage, Field, Screen } from '@/components/ui';
import { signIn } from '@/features/auth/api';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({ mutationFn: signIn, onSuccess: () => router.replace('/friends') });
  const valid = email.includes('@') && password.length > 0;

  return (
    <Screen>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
      <Field label="Password" placeholder="Your password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={() => valid && mutation.mutate({ email, password })} />
      <Button title={mutation.isPending ? 'Signing in…' : 'Sign in'} disabled={!valid} loading={mutation.isPending} onPress={() => mutation.mutate({ email, password })} />
      <Button title="Forgot password?" href="/forgot-password" secondary />
    </Screen>
  );
}
