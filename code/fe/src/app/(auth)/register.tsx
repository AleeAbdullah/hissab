import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, type TextInput, View } from 'react-native';

import { ErrorMessage, Field, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { register } from '@/features/auth/api';
import { AuthLegalLinks } from '@/features/auth/components/auth-legal-links';
import { AuthPageHeader } from '@/features/auth/components/auth-page-header';
import {
  MIN_PASSWORD_LENGTH,
  PasswordRequirement
} from '@/features/auth/components/password-requirement';
import { isEmail } from '@/features/auth/validation';

export default function RegisterScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const mutation = useMutation({
    mutationFn: register,
    onSuccess: () => router.replace('/home')
  });
  const emailValid = isEmail(email);
  const valid =
    displayName.trim().length > 0 &&
    emailValid &&
    password.length >= MIN_PASSWORD_LENGTH;
  const submit = () => {
    if (!valid || mutation.isPending) return;
    mutation.mutate({
      displayName: displayName.trim(),
      email: email.trim(),
      password
    });
  };

  return (
    <Screen
      footer={
        <View className="gap-1">
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
              <Text>Create account</Text>
            )}
          </Button>
          <View className="flex-row flex-wrap items-center justify-center">
            <Text className="text-[15px] leading-[22px] text-muted-foreground">
              Already have an account?
            </Text>
            <Link href="/sign-in" replace asChild>
              <Button
                variant="link"
                size="compact"
                role="link"
                className="px-1.5"
              >
                <Text>Sign in</Text>
              </Button>
            </Link>
          </View>
        </View>
      }
    >
      <AuthPageHeader title="Create account" />
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field
        label="Display name"
        placeholder="How friends will see you"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <Field
        inputRef={emailRef}
        label="Email"
        placeholder="you@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        textContentType="emailAddress"
        autoCorrect={false}
        spellCheck={false}
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        onBlur={() => setEmailTouched(true)}
        error={
          emailTouched && email.trim() && !emailValid
            ? 'Enter a full email address, like name@example.com.'
            : undefined
        }
        value={email}
        onChangeText={setEmail}
      />
      <Field
        inputRef={passwordRef}
        label="Password"
        placeholder="Create a password"
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        value={password}
        onChangeText={setPassword}
      />
      <PasswordRequirement password={password} />
      <AuthLegalLinks agreement />
    </Screen>
  );
}
