import { useMutation, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { ExternalLink } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import {
  Avatar,
  Card,
  ErrorMessage,
  Loading,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import {
  notificationPreferencesQuery,
  profileQuery,
  sessionsQuery
} from '@/features/account/api';
import { ExportAccountRow } from '@/features/account/components/export-account-row';
import { LocalePicker } from '@/features/account/components/locale-picker';
import {
  canRegisterPushNotifications,
  pushDeviceQuery
} from '@/features/account/push';
import { isActiveSession } from '@/features/account/sessions';
import { signOut } from '@/features/auth/api';
import { useSession } from '@/features/auth/session';
import { isolate } from '@/i18n';

const externalIcon = (
  <Icon as={ExternalLink} size={18} className="text-muted-foreground" />
);

export default function AccountScreen() {
  const { t } = useTranslation(['account', 'common']);
  const dialog = useDialog();
  const profile = useQuery(profileQuery);
  const sessions = useQuery(sessionsQuery);
  const notifications = useQuery(notificationPreferencesQuery);
  const userId = useSession()?.user.id;
  const pushDevice = useQuery({
    ...pushDeviceQuery(userId ?? ''),
    enabled: !!userId
  });
  const mutation = useMutation({ mutationFn: signOut });
  if (profile.isLoading) return <Loading />;

  return (
    <Screen>
      {profile.error || mutation.error ? (
        <ErrorMessage error={profile.error ?? mutation.error} />
      ) : null}
      {profile.data ? (
        <Card>
          <Row
            title={profile.data.displayName}
            subtitle={profile.data.email}
            href="/account/profile"
            leading={<Avatar name={profile.data.displayName} large />}
          />
        </Card>
      ) : null}
      <SectionLabel>{t('preferences')}</SectionLabel>
      <Card>
        <Row
          title={t('displayCurrency')}
          detail={profile.data?.displayCurrency}
          href="/account/profile"
        />
        <LocalePicker savedLocale={profile.data?.locale} />
        <Row
          title={t('notifications')}
          detail={
            !canRegisterPushNotifications()
              ? t('unavailable')
              : notifications.data?.pushEnabled
                ? pushDevice.data
                  ? t('on')
                  : pushDevice.data === false
                    ? t('offOnThisDevice')
                    : undefined
                : notifications.data
                  ? t('off')
                  : undefined
          }
          href="/account/notifications"
        />
      </Card>
      <SectionLabel>{t('security')}</SectionLabel>
      <Card>
        <Row title={t('changePassword')} href="/account/change-password" />
        <Row title={t('blockedPeople')} href="/account/blocked-people" />
        <Row
          title={t('devicesAndSessions')}
          detail={
            sessions.data
              ? t('activeSessions', {
                  count: sessions.data.filter((session) =>
                    isActiveSession(session)
                  ).length
                })
              : undefined
          }
          href="/account/sessions"
        />
      </Card>
      <SectionLabel>{t('yourData')}</SectionLabel>
      <Card>
        <ExportAccountRow />
        <Row
          title={t('deleteAccount')}
          href="/account/delete-account"
          destructive
        />
      </Card>
      <SectionLabel>{t('legal')}</SectionLabel>
      <Card>
        <Row
          title={t('privacyPolicy')}
          href="https://hissabapp.vercel.app/privacy/"
          trailing={externalIcon}
        />
        <Row
          title={t('termsAndConditions')}
          href="https://hissabapp.vercel.app/terms/"
          trailing={externalIcon}
        />
      </Card>
      <View className="gap-2">
        <Button
          variant="outline"
          disabled={mutation.isPending}
          accessibilityState={{
            disabled: mutation.isPending,
            busy: mutation.isPending
          }}
          onPress={() =>
            dialog(t('signOut'), t('thisSignsOutOnlyThisDevice'), [
              { text: t('common:cancel'), style: 'cancel' },
              { text: t('signOut2'), onPress: () => mutation.mutate() }
            ])
          }
        >
          {mutation.isPending ? (
            <ActivityIndicator className="text-primary" />
          ) : (
            <Text>{t('signOut2')}</Text>
          )}
        </Button>
        <Text
          selectable
          className="text-center text-[13px] text-muted-foreground"
        >
          {t('version', {
            version: isolate(Constants.expoConfig?.version ?? '1.0')
          })}
        </Text>
      </View>
    </Screen>
  );
}
