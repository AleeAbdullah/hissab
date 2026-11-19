import { useMutation } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, type TextInput, View } from 'react-native';

import { ErrorMessage, Field, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { signIn } from '@/features/auth/api';
import { AuthLegalLinks } from '@/features/auth/components/auth-legal-links';
import { isEmail } from '@/features/auth/validation';

export default function SignInScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [password, setPassword] = useState('');
  const passwordRef = useRef<TextInput>(null);
  const mutation = useMutation({
    mutationFn: signIn,
    onSuccess: () => router.replace('/home')
  });
  const emailValid = isEmail(email);
  const valid = emailValid && password.length > 0;
  const submit = () => {
    if (!valid || mutation.isPending) return;
    mutation.mutate({ email: email.trim(), password });
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
              <Text>{t('signIn')}</Text>
            )}
          </Button>
          <View className="flex-row flex-wrap items-center justify-center">
            <Text className="text-[15px] leading-[22px] text-muted-foreground">
              {t('newToTallyStick')}
            </Text>
            <Link href="/register" replace asChild>
              <Button
                variant="link"
                size="compact"
                role="link"
                className="px-1.5"
              >
                <Text>{t('createAccount')}</Text>
              </Button>
            </Link>
          </View>
        </View>
      }
    >
      <View className="gap-3 pb-2">
        <Text
          selectable
          accessibilityRole="header"
          className="font-serif text-[48px] font-medium leading-[52px]"
        >
          {t('tallyStick')}
        </Text>
        <View className="h-px w-12 bg-primary" />
        <Text
          selectable
          className="text-[17px] leading-[24px] text-muted-foreground"
        >
          {t('welcomeBack')}
        </Text>
      </View>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field
        label={t('email')}
        placeholder={t('youexamplecom')}
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
            ? t('enterAFullEmailAddressLikeNameexamplecom')
            : undefined
        }
        value={email}
        onChangeText={setEmail}
      />
      <View className="gap-1">
        <Field
          inputRef={passwordRef}
          label={t('password')}
          placeholder={t('yourPassword')}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          value={password}
          onChangeText={setPassword}
        />
        <View className="items-start">
          <Link href="/forgot-password" asChild>
            <Button variant="link" size="compact" role="link" className="px-0">
              <Text>{t('forgotPassword')}</Text>
            </Button>
          </Link>
        </View>
      </View>
      <AuthLegalLinks />
    </Screen>
  );
}
