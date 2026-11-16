import { useMutation } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, type TextInput } from 'react-native';

import { ErrorMessage, Field, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { resetPassword } from '@/features/auth/api';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';
import {
  MIN_PASSWORD_LENGTH,
  PasswordRequirement
} from '@/features/auth/components/password-requirement';

export default function ResetPasswordScreen() {
  const { token = '' } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const confirmRef = useRef<TextInput>(null);
  const mutation = useMutation({
    mutationFn: () => resetPassword(token, password)
  });
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid =
    token.length >= 32 &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirm;

  if (mutation.isSuccess) {
    return (
      <Screen>
        <AuthPageHeader title="Password changed" />
        <Notice title="Sign in again">
          Every session has ended. Sign in again with your new password.
        </Notice>
        <Link href="/sign-in" asChild>
          <Button variant="outline" role="link">
            <Text>Back to sign in</Text>
          </Button>
        </Link>
      </Screen>
    );
  }

  const submit = () => {
    if (valid && !mutation.isPending) mutation.mutate();
  };

  return (
    <Screen
      footer={
        <Button
          disabled={!valid || mutation.isPending}
          accessibilityState={{
            disabled: !valid || mutation.isPending,
            busy: mutation.isPending
          }}
          onPress={submit}
        >
          {mutation.isPending ? (
            <ActivityIndicator className="text-primary-foreground" />
          ) : (
            <Text>Save new password</Text>
          )}
        </Button>
      }
    >
      <AuthPageHeader
        title="Set new password"
        description="You'll need to sign in again on every device."
      />
      {!token ? (
        <Notice error title="Reset link missing">
          Open this screen from the link in your email, or request a new one.
        </Notice>
      ) : null}
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field
        label="New password"
        placeholder="Create a password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
        value={password}
        onChangeText={setPassword}
      />
      <PasswordRequirement password={password} />
      <Field
        inputRef={confirmRef}
        label="Confirm new password"
        placeholder="Type it again"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        value={confirm}
        onChangeText={setConfirm}
        error={mismatch ? "The passwords don't match." : undefined}
      />
      {!token ? (
        <Link href="/forgot-password" asChild>
          <Button variant="outline" role="link">
            <Text>Request a new link</Text>
          </Button>
        </Link>
      ) : null}
    </Screen>
  );
}
