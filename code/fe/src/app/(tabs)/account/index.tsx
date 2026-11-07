import { useMutation, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
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
import { Text } from '@/components/ui/text';
import {
  notificationPreferencesQuery,
  profileQuery,
  sessionsQuery
} from '@/features/account/api';
import { ExportAccountRow } from '@/features/account/components/export-account-row';
import { canRegisterPushNotifications } from '@/features/account/push';
import { signOut } from '@/features/auth/api';

export default function AccountScreen() {
  const dialog = useDialog();
  const profile = useQuery(profileQuery);
  const sessions = useQuery(sessionsQuery);
  const notifications = useQuery(notificationPreferencesQuery);
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
      <SectionLabel>PREFERENCES</SectionLabel>
      <Card>
        <Row
          title="Display currency"
          detail={profile.data?.displayCurrency}
          href="/account/profile"
        />
        <Row
          title="Notifications"
          subtitle={
            !canRegisterPushNotifications()
              ? 'Push unavailable'
              : notifications.data?.pushEnabled
                ? 'On'
                : notifications.data
                  ? 'Push off'
                  : undefined
          }
          href="/account/notifications"
        />
      </Card>
      <SectionLabel>SECURITY</SectionLabel>
      <Card>
        <Row title="Change password" href="/account/change-password" />
        <Row title="Blocked people" href="/account/blocked-people" />
        <Row
          title="Devices and sessions"
          detail={sessions.data ? `${sessions.data.length} active` : undefined}
          href="/account/sessions"
        />
      </Card>
      <SectionLabel>YOUR DATA</SectionLabel>
      <Card>
        <ExportAccountRow />
        <Row
          title="Delete account"
          href="/account/delete-account"
          destructive
        />
      </Card>
      <SectionLabel>LEGAL</SectionLabel>
      <Card>
        <Row
          title="Privacy policy"
          href="https://hissabapp.vercel.app/privacy/"
        />
        <Row
          title="Terms and conditions"
          href="https://hissabapp.vercel.app/terms/"
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
            dialog('Sign out?', 'This signs out only this device.', [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Sign out', onPress: () => mutation.mutate() }
            ])
          }
        >
          {mutation.isPending ? (
            <ActivityIndicator className="text-primary" />
          ) : (
            <Text>Sign out</Text>
          )}
        </Button>
        <Text
          selectable
          className="text-center text-[13px] text-muted-foreground"
        >
          Tally Stick {Constants.expoConfig?.version ?? '1.0'} · Other sessions
          stay signed in.
        </Text>
      </View>
    </Screen>
  );
}
