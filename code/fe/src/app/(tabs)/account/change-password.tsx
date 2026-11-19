import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { ErrorMessage, Field, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { changePassword } from '@/features/auth/api';

export default function ChangePasswordScreen() {
  const { t } = useTranslation(['account', 'common']);
  const router = useRouter();
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const mutation = useMutation({
    mutationFn: () => changePassword(current, password),
    onSuccess: () => router.replace('/sign-in')
  });
  const mismatch = confirm.length > 0 && password !== confirm;
  const valid =
    current.length > 0 && password.length >= 12 && password === confirm;

  return (
    <Screen>
      <Notice title={t('everyDeviceWillBeSignedOut')}>
        {t('changingYourPasswordEndsEverySessionIncludingThisOne')}
      </Notice>
      {mutation.error ? <ErrorMessage error={mutation.error} /> : null}
      <Field
        label={t('currentPassword')}
        secureTextEntry
        autoComplete="current-password"
        value={current}
        onChangeText={setCurrent}
      />
      <Field
        label={t('newPassword')}
        secureTextEntry
        autoComplete="new-password"
        value={password}
        onChangeText={setPassword}
        hint={t('atLeast12CharactersLongerBeatsComplicated')}
      />
      <Field
        label={t('confirmNewPassword')}
        secureTextEntry
        autoComplete="new-password"
        value={confirm}
        onChangeText={setConfirm}
        error={mismatch ? t('theTwoNewPasswordsDoNotMatch') : undefined}
      />
      <Button
        disabled={!valid || mutation.isPending}
        accessibilityState={{
          disabled: !valid || mutation.isPending,
          busy: mutation.isPending
        }}
        onPress={() => mutation.mutate()}
      >
        {mutation.isPending ? (
          <ActivityIndicator className="text-primary-foreground" />
        ) : (
          <Text>{t('changePassword')}</Text>
        )}
      </Button>
    </Screen>
  );
}
