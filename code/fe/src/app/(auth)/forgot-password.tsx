import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, ErrorMessage, Screen } from '@/components/ui';
import { forgotPassword } from '@/features/auth/api';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';
import { AuthTextField } from '@/features/auth/components/auth-field';
import { useAppTheme } from '@/theme/theme';

export default function ForgotPasswordScreen() {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState('');
  const mutation = useMutation({ mutationFn: forgotPassword });

  if (mutation.isSuccess) {
    return (
      <Screen>
        <View style={{ flex: 1, justifyContent: 'center', gap: 8 }}>
          <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: colors.brandSubtle, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: colors.brand, fontSize: 28, fontWeight: '700' }}>✓</Text>
          </View>
          <Text selectable style={{ color: colors.text, fontSize: 20, lineHeight: 25, fontWeight: '600' }}>Instructions requested</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>If an account exists for {email}, a reset link request has been recorded. Reset email delivery is coming later, so no link has been sent.</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16 }}>We do not confirm whether an email is registered.</Text>
        </View>
        <Button title="Back to sign in" href="/sign-in" secondary />
      </Screen>
    );
  }

  return (
    <Screen>
      <AuthPageHeader title="Reset password" description="Enter the email on your account to request a link for setting a new password." />
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Card>
        <AuthTextField first label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
      </Card>
      <Button title={mutation.isPending ? 'Requesting…' : 'Send reset instructions'} disabled={!email.includes('@')} loading={mutation.isPending} onPress={() => mutation.mutate(email)} />
    </Screen>
  );
}
