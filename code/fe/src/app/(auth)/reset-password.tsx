import { useMutation } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['auth', 'common']);
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
        <AuthPageHeader title={t('passwordChanged')} />
        <Notice title={t('signInAgain')}>
          {t('everySessionHasEndedSignInAgainWithYour')}
        </Notice>
        <Link href="/sign-in" asChild>
          <Button variant="outline" role="link">
            <Text>{t('backToSignIn')}</Text>
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
            <Text>{t('saveNewPassword')}</Text>
          )}
        </Button>
      }
    >
      <AuthPageHeader
        title={t('setNewPassword')}
        description={t('youllNeedToSignInAgainOnEveryDevice')}
      />
      {!token ? (
        <Notice error title={t('resetLinkMissing')}>
          {t('openThisScreenFromTheLinkInYourEmail')}
        </Notice>
      ) : null}
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field
        label={t('newPassword')}
        placeholder={t('createAPassword')}
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
        label={t('confirmNewPassword')}
        placeholder={t('typeItAgain')}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="go"
        onSubmitEditing={submit}
        value={confirm}
        onChangeText={setConfirm}
        error={mismatch ? t('thePasswordsDontMatch') : undefined}
      />
      {!token ? (
        <Link href="/forgot-password" asChild>
          <Button variant="outline" role="link">
            <Text>{t('requestANewLink')}</Text>
          </Button>
        </Link>
      ) : null}
    </Screen>
  );
}
