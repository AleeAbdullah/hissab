import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ErrorMessage, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { signIn } from '@/features/auth/api';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';
import { AuthTextField } from '@/features/auth/components/auth-field';
import { AuthLegalLinks } from '@/features/auth/components/auth-legal-links';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: () => router.replace('/home')
  });
  const valid = email.includes('@') && password.length > 0;

  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <Screen>
        <View className="flex-grow justify-between gap-8">
          <AuthPageHeader back title="Sign in" />
          <View className="flex-grow justify-center gap-4">
            <View className="gap-3 pb-4">
              <Text
                selectable
                className="font-serif text-[48px] font-medium leading-[52px]"
              >
                Hissab
              </Text>
              <View className="h-px w-12 bg-primary" />
              <Text
                selectable
                className="text-[15px] leading-[22px] text-muted-foreground"
              >
                Welcome back. Your shared balances and activity are here when
                you need them.
              </Text>
            </View>
            {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
            <Card>
              <AuthTextField
                first
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
                placeholder="Your password"
                secureTextEntry
                autoComplete="current-password"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={() =>
                  valid && mutation.mutate({ email, password })
                }
              />
            </Card>
          </View>
          <View className="gap-2">
            <Button
              disabled={!valid || mutation.isPending}
              accessibilityState={{
                disabled: !valid || mutation.isPending,
                busy: mutation.isPending
              }}
              onPress={() => mutation.mutate({ email, password })}
            >
              {mutation.isPending ? (
                <ActivityIndicator className="text-primary-foreground" />
              ) : (
                <Text>Sign in</Text>
              )}
            </Button>
            <View className="items-center">
              <Link href="/forgot-password" asChild>
                <Button variant="link" role="link">
                  <Text>Forgot password?</Text>
                </Button>
              </Link>
            </View>
            <AuthLegalLinks />
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}
