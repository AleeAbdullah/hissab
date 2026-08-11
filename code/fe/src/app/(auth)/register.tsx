import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, ErrorMessage, Screen } from '@/components/ui';
import { register } from '@/features/auth/api';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';
import { AuthTextField } from '@/features/auth/components/auth-field';
import { useAppTheme } from '@/theme/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC');
  const mutation = useMutation({ mutationFn: register, onSuccess: () => router.replace('/home') });
  const valid = displayName.trim().length > 0 && email.includes('@') && password.length >= 12 && timezone.length > 0;

  return (
    <Screen>
      <AuthPageHeader title="Create account" description="Your profile and timezone can be changed later in Account." />
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Card>
        <AuthTextField first label="Display name" placeholder="How friends will see you" autoComplete="name" value={displayName} onChangeText={setDisplayName} />
        <AuthTextField label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
        <AuthTextField label="Password" placeholder="Create a password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} hint="At least 12 characters. No other restrictions." />
      </Card>
      <Card>
        <AuthTextField first label="Timezone" value={timezone} onChangeText={setTimezone} hint="Use an IANA timezone such as Asia/Karachi." />
      </Card>
      <View style={{ gap: 12 }}>
        <Button
          title={mutation.isPending ? 'Creating account…' : 'Create account'}
          disabled={!valid}
          loading={mutation.isPending}
          onPress={() => mutation.mutate({ displayName: displayName.trim(), email, password, timezone })}
        />
        <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16, textAlign: 'center' }}>By creating an account you agree to the Terms and Privacy Policy.</Text>
      </View>
    </Screen>
  );
}
