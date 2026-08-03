import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, Card, ErrorMessage, Screen } from '@/components/ui';
import { signIn } from '@/features/auth/api';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';
import { AuthTextField } from '@/features/auth/components/auth-field';
import { useAppTheme } from '@/theme/theme';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({ mutationFn: signIn, onSuccess: () => router.replace('/friends') });
  const valid = email.includes('@') && password.length > 0;
  const { colors } = useAppTheme();

  return (
    <Screen>
      <AuthPageHeader title="Sign in" />
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Card>
        <AuthTextField first label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
        <AuthTextField label="Password" placeholder="Your password" secureTextEntry autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={() => valid && mutation.mutate({ email, password })} />
      </Card>
      <Button title={mutation.isPending ? 'Signing in…' : 'Sign in'} disabled={!valid} loading={mutation.isPending} onPress={() => mutation.mutate({ email, password })} />
      <View style={{ alignItems: 'center' }}>
        <Link href="/forgot-password" asChild>
          <Pressable accessibilityRole="link" style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
            <Text style={{ color: colors.brand, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>Forgot password?</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}
