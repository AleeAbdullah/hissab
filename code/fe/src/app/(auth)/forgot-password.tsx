import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Card, ErrorMessage, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { forgotPassword } from '@/features/auth/api';
import { AuthTextField } from '@/features/auth/components/auth-field';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const mutation = useMutation({ mutationFn: forgotPassword });

  if (mutation.isSuccess) {
    return (
      <Screen>
        <View className="flex-1 justify-center gap-2">
          <View className="size-[72px] items-center justify-center rounded-full bg-accent">
            <Text className="text-[28px] font-bold text-primary">✓</Text>
          </View>
          <Text selectable className="text-xl font-semibold leading-[25px]">
            Check your email
          </Text>
          <Text
            selectable
            className="text-[15px] leading-[22px] text-muted-foreground"
          >
            If an account exists for {email}, we&apos;ve sent a link to set a
            new password. Open it on this phone within 60 minutes. Check your
            spam folder if it doesn&apos;t arrive.
          </Text>
          <Text selectable className="text-xs leading-4 text-muted-foreground">
            We do not confirm whether an email is registered.
          </Text>
        </View>
        <Link href="/sign-in" asChild>
          <Button variant="outline" role="link">
            <Text>Back to sign in</Text>
          </Button>
        </Link>
      </Screen>
    );
  }

  return (
    <Screen>
      <AuthPageHeader
        title="Reset password"
        description="Enter the email on your account to request a link for setting a new password."
      />
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
      </Card>
      <Button
        disabled={!email.includes('@') || mutation.isPending}
        accessibilityState={{
          disabled: !email.includes('@') || mutation.isPending,
          busy: mutation.isPending
        }}
        onPress={() => mutation.mutate(email)}
      >
        {mutation.isPending ? (
          <ActivityIndicator className="text-primary-foreground" />
        ) : (
          <Text>Send reset instructions</Text>
        )}
      </Button>
    </Screen>
  );
}
