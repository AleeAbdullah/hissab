import { useMutation, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { ActivityIndicator, Alert, View } from 'react-native';

import { notificationPreferencesQuery, profileQuery, sessionsQuery } from '@/features/account/api';
import { signOut } from '@/features/auth/api';
import { Avatar, Card, ErrorMessage, Loading, Row, Screen, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export default function AccountScreen() {
  const profile = useQuery(profileQuery);
  const sessions = useQuery(sessionsQuery);
  const notifications = useQuery(notificationPreferencesQuery);
  const mutation = useMutation({ mutationFn: signOut });
  if (profile.isLoading) return <Loading />;

  return (
    <Screen>
      {profile.error || mutation.error ? <ErrorMessage error={profile.error ?? mutation.error} /> : null}
      {profile.data ? (
        <Card>
          <Row title={profile.data.displayName} subtitle={profile.data.email} href="/account/profile" leading={<Avatar name={profile.data.displayName} large />} />
        </Card>
      ) : null}
      <SectionLabel>TEMPORARY</SectionLabel>
      <Card>
        <Row title="Home" subtitle="Temporary access while navigation is being decided" href="/home" />
      </Card>
      <SectionLabel>PREFERENCES</SectionLabel>
      <Card>
        <Row title="Display currency" detail={profile.data?.displayCurrency} href="/account/profile" />
        <Row title="Timezone" detail={profile.data?.timezone} href="/account/profile" />
        <Row title="Report mode" detail={profile.data?.personalReportMode === 'CASH_OUT_OF_POCKET' ? 'Cash out of pocket' : 'Your share'} href="/account/profile" />
      </Card>
      <SectionLabel>SECURITY</SectionLabel>
      <Card>
        <Row title="Change password" href="/account/change-password" />
        <Row title="Devices and sessions" detail={sessions.data ? `${sessions.data.length} active` : undefined} href="/account/sessions" />
        <Row title="Notifications" detail={notifications.data?.pushEnabled ? 'On' : notifications.data ? 'Off' : undefined} href="/account/notifications" />
      </Card>
      <SectionLabel>YOUR DATA</SectionLabel>
      <Card>
        <Row title="Export your data" href="/account/export" />
        <Row title="Delete account" href="/account/delete-account" destructive />
      </Card>
      <View className="gap-2">
        <Button
          variant="outline"
          disabled={mutation.isPending}
          accessibilityState={{ disabled: mutation.isPending, busy: mutation.isPending }}
          onPress={() => Alert.alert('Sign out?', 'This signs out only this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => mutation.mutate() }])}
        >
          {mutation.isPending ? <ActivityIndicator className="text-primary" /> : <Text>Sign out</Text>}
        </Button>
        <Text selectable className="text-center text-[13px] text-muted-foreground">Hissab {Constants.expoConfig?.version ?? '1.0'} · Other sessions stay signed in.</Text>
      </View>
    </Screen>
  );
}
