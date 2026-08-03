import { useMutation, useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Alert, Text, View } from 'react-native';

import { profileQuery, sessionsQuery } from '@/features/account/api';
import { signOut } from '@/features/auth/api';
import { Avatar, Button, Card, ErrorMessage, Loading, Row, Screen, SectionLabel } from '@/components/ui';
import { useAppTheme } from '@/theme/use-app-theme';

export default function AccountScreen() {
  const { colors } = useAppTheme();
  const profile = useQuery(profileQuery);
  const sessions = useQuery(sessionsQuery);
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
      <SectionLabel>PREFERENCES</SectionLabel>
      <Card>
        <Row title="Default currency" detail={profile.data?.defaultCurrency} href="/account/profile" />
        <Row title="Timezone" detail={profile.data?.timezone} href="/account/profile" />
        <Row title="Report mode" detail={profile.data?.personalReportMode === 'CASH_OUT_OF_POCKET' ? 'Cash out of pocket' : 'Your share'} href="/account/profile" />
      </Card>
      <SectionLabel>SECURITY</SectionLabel>
      <Card>
        <Row title="Change password" href="/account/change-password" />
        <Row title="Devices and sessions" detail={sessions.data ? `${sessions.data.length} active` : undefined} href="/account/sessions" />
        <Row title="Notifications" detail="Coming later" href="/account/notifications" />
      </Card>
      <SectionLabel>YOUR DATA</SectionLabel>
      <Card>
        <Row title="Export your data" href="/account/export" />
        <Row title="Delete account" href="/account/delete-account" destructive />
      </Card>
      <View style={{ gap: 8 }}>
        <Button
          title={mutation.isPending ? 'Signing out…' : 'Sign out'}
          secondary
          loading={mutation.isPending}
          onPress={() => Alert.alert('Sign out?', 'This signs out only this device.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign out', onPress: () => mutation.mutate() }])}
        />
        <Text selectable style={{ color: colors.secondary, fontSize: 13, textAlign: 'center' }}>Hissab {Constants.expoConfig?.version ?? '1.0'} · Other sessions stay signed in.</Text>
      </View>
    </Screen>
  );
}
