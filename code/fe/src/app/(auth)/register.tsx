import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ErrorMessage, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { register } from '@/features/auth/api';
import { AuthTextField } from '@/features/auth/components/auth-field';
import { AuthLegalLinks } from '@/features/auth/components/auth-legal-links';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';

export default function RegisterScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => router.replace('/home')
  });
  const valid =
    displayName.trim().length > 0 &&
    email.includes('@') &&
    password.length >= 12;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <Screen>
        <View className="flex-grow justify-between gap-8">
          <View className="gap-4">
            <AuthPageHeader back title="Create account" />
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
                hint="At least 12 characters."
              />
            </Card>
          </View>
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
                  password
                })
              }
            >
              {mutation.isPending ? (
                <ActivityIndicator className="text-primary-foreground" />
              ) : (
                <Text>Create account</Text>
              )}
            </Button>
            <AuthLegalLinks agreement />
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}
