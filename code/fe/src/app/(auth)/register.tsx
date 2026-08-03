import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';

import { Button, ErrorMessage, Field, Screen } from '@/components/ui';
import { register } from '@/features/auth/api';
import { CurrencyPicker } from '@/features/auth/currency-picker';
import { useAppTheme } from '@/theme/theme';

export default function RegisterScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [defaultCurrency, setDefaultCurrency] = useState<string>();
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC');
  const mutation = useMutation({ mutationFn: register, onSuccess: () => router.replace('/friends') });
  const valid = displayName.trim().length > 0 && email.includes('@') && password.length >= 12 && Boolean(defaultCurrency) && timezone.length > 0;

  return (
    <Screen>
      <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 20 }}>Your default currency and timezone can be changed later in Account.</Text>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field label="Display name" placeholder="How friends will see you" autoComplete="name" value={displayName} onChangeText={setDisplayName} />
      <Field label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" value={email} onChangeText={setEmail} />
      <Field label="Password" placeholder="Create a password" secureTextEntry autoComplete="new-password" value={password} onChangeText={setPassword} hint="At least 12 characters. Longer beats complicated." />
      <CurrencyPicker value={defaultCurrency} onChange={setDefaultCurrency} />
      <Field label="Timezone" value={timezone} onChangeText={setTimezone} hint="Use an IANA timezone such as Asia/Karachi." />
      <Button
        title={mutation.isPending ? 'Creating account…' : 'Create account'}
        disabled={!valid}
        loading={mutation.isPending}
        onPress={() => mutation.mutate({ displayName: displayName.trim(), email, password, defaultCurrency: defaultCurrency!, timezone })}
      />
      <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18, textAlign: 'center' }}>By creating an account you agree to the Terms and Privacy Policy.</Text>
    </Screen>
  );
}
