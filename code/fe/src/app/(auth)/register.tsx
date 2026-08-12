import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Card, ErrorMessage, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { register } from '@/features/auth/api';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';
import { AuthTextField } from '@/features/auth/components/auth-field';

export default function RegisterScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'UTC'
  );
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => router.replace('/home')
  });
  const valid =
    displayName.trim().length > 0 &&
    email.includes('@') &&
    password.length >= 12 &&
    timezone.length > 0;

  return (
    <Screen>
      <AuthPageHeader
        title="Create account"
        description="Your profile and timezone can be changed later in Account."
      />
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Card>
        <AuthTextField
          first
          label="Display name"
          placeholder="How friends will see you"
          autoComplete="name"
          value={displayName}
          onChangeText={setDisplayName}
        />
        <AuthTextField
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          value={email}
          onChangeText={setEmail}
        />
        <AuthTextField
          label="Password"
          placeholder="Create a password"
          secureTextEntry
          autoComplete="new-password"
          value={password}
          onChangeText={setPassword}
          hint="At least 12 characters. No other restrictions."
        />
      </Card>
      <Card>
        <AuthTextField
          first
          label="Timezone"
          value={timezone}
          onChangeText={setTimezone}
          hint="Use an IANA timezone such as Asia/Karachi."
        />
      </Card>
      <View className="gap-3">
        <Button
          disabled={!valid || mutation.isPending}
          accessibilityState={{
            disabled: !valid || mutation.isPending,
            busy: mutation.isPending
          }}
          onPress={() =>
            mutation.mutate({
              displayName: displayName.trim(),
              email,
              password,
              timezone
            })
          }
        >
          {mutation.isPending ? (
            <ActivityIndicator className="text-primary-foreground" />
          ) : (
            <Text>Create account</Text>
          )}
        </Button>
        <Text
          selectable
          className="text-center text-xs leading-4 text-muted-foreground"
        >
          By creating an account you agree to the Terms and Privacy Policy.
        </Text>
      </View>
    </Screen>
  );
}
