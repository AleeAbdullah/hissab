import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, ErrorMessage, Field, Screen } from '@/components/ui';
import { forgotPassword } from '@/features/auth/api';
import { useAppTheme } from '@/theme/use-app-theme';

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const mutation = useMutation({ mutationFn: forgotPassword });

  if (mutation.isSuccess) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
          <Text selectable style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>Instructions requested</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 20 }}>If an account exists for {email}, a reset link has been requested. The link expires in 60 minutes.</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>Email delivery is coming later. We do not confirm whether an email is registered.</Text>
        </View>
        <Button title="Back to sign in" href="/sign-in" secondary />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 20 }}>Enter the email on your account to request a link for setting a new password.</Text>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
      <Button title={mutation.isPending ? 'Requesting…' : 'Send reset instructions'} disabled={!email.includes('@')} loading={mutation.isPending} onPress={() => mutation.mutate(email)} />
    </Screen>
  );
}
