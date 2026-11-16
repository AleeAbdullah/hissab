import { useMutation } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Icons } from '@/components/icons';
import { ErrorMessage, Field, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { forgotPassword } from '@/features/auth/api';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';
import { isEmail } from '@/features/auth/validation';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const mutation = useMutation({ mutationFn: forgotPassword });

  if (mutation.isSuccess) {
    return (
      <Screen>
        <View className="flex-1 justify-center gap-2">
          <View className="size-[72px] items-center justify-center rounded-full bg-accent">
            <Icon as={Icons.check} size={32} className="text-primary" />
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

  const emailValid = isEmail(email);
  const submit = () => {
    if (emailValid && !mutation.isPending) mutation.mutate(email.trim());
  };

  return (
    <Screen
      footer={
        <Button
          disabled={!emailValid || mutation.isPending}
          accessibilityState={{
            disabled: !emailValid || mutation.isPending,
            busy: mutation.isPending
          }}
          onPress={submit}
        >
          {mutation.isPending ? (
            <ActivityIndicator className="text-primary-foreground" />
          ) : (
            <Text>Send reset link</Text>
          )}
        </Button>
      }
    >
      <AuthPageHeader
        title="Reset password"
        description="Enter the email on your account and we'll send a link to set a new password."
      />
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="send"
        onSubmitEditing={submit}
        onBlur={() => setEmailTouched(true)}
        error={
          emailTouched && email.trim() && !emailValid
            ? 'Enter a full email address, like name@example.com.'
            : undefined
        }
        value={email}
        onChangeText={setEmail}
      />
    </Screen>
  );
}
