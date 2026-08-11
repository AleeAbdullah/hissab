import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Alert, Switch, Text, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import type { NotificationPreferences } from '@/api/contracts';
import { Button, Card, ErrorMessage, Loading, Notice, Screen } from '@/components/ui';
import {
  notificationPreferencesQuery,
  notificationInboxInfiniteQuery,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences,
} from '@/features/account/api';
import { NotificationInbox } from '@/features/account/components/notification-inbox';
import { useSession } from '@/features/auth/session';
import { canRegisterPushNotifications, hasRegisteredPushDevice, registerForPushNotifications, revokePushNotifications } from '@/features/account/push';
import { useAppTheme } from '@/theme/theme';

type PreferenceKey = Exclude<keyof NotificationPreferences, 'updatedAt'>;

const options: { key: PreferenceKey; title: string; description: string }[] = [
  { key: 'pushEnabled', title: 'Push notifications', description: 'Receive Hissab alerts on this device.' },
  { key: 'expenseActivityEnabled', title: 'Expenses', description: 'New and updated shared expenses.' },
  { key: 'settlementActivityEnabled', title: 'Settlements', description: 'Recorded and updated settlements.' },
  { key: 'socialActivityEnabled', title: 'Social activity', description: 'Connection and group invitation updates.' },
  { key: 'remindersEnabled', title: 'Balance reminders', description: 'Manual reminders from people you owe.' },
];

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const session = useSession();
  const preferences = useQuery(notificationPreferencesQuery);
  const inbox = useInfiniteQuery(notificationInboxInfiniteQuery());
  const mutation = useMutation({ mutationFn: updateNotificationPreferences });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const revokePush = useMutation({ mutationFn: () => revokePushNotifications(session?.user.id ?? '') });
  const [setupError, setSetupError] = useState<string>();
  const [deviceRegistered, setDeviceRegistered] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const registered = session?.user.id ? await hasRegisteredPushDevice(session.user.id).catch(() => false) : false;
      if (active) setDeviceRegistered(registered);
    })();
    return () => { active = false; };
  }, [session?.user.id]);

  if (preferences.isLoading) return <Loading />;
  const notifications = inbox.data?.pages.flatMap((page) => page.items) ?? [];
  const update = async (key: PreferenceKey, value: boolean) => {
    setSetupError(undefined);
    try {
      if (key === 'pushEnabled' && value && session?.user.id) {
        await registerForPushNotifications(session.user.id);
        setDeviceRegistered(true);
      }
      const next = await mutation.mutateAsync({ [key]: value });
      queryClient.setQueryData(notificationPreferencesQuery.queryKey, next);
    } catch (error) {
      setSetupError(error instanceof Error ? error.message : 'Could not update notification settings.');
    }
  };

  return (
    <Screen>
      {preferences.error ? <ErrorMessage error={preferences.error} /> : null}
      {!canRegisterPushNotifications() ? <Notice title="Physical device required">Push registration is available in your Hissab development build on a physical iOS or Android device.</Notice> : null}
      {setupError ? <Notice title="Could not enable push notifications" error>{setupError}</Notice> : null}
      {preferences.data ? (
        <Card>
          {options.map((option) => (
            <PreferenceRow
              key={option.key}
              title={option.title}
              description={option.description}
              value={preferences.data[option.key]}
              disabled={mutation.isPending || (option.key === 'pushEnabled' && !canRegisterPushNotifications())}
              onChange={(value) => update(option.key, value)}
              colors={colors}
            />
          ))}
        </Card>
      ) : null}
      <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>
        Turning push notifications on asks your device for permission and securely registers this app installation with Hissab.
      </Text>
      {deviceRegistered ? <Button title="Disable push on this device" secondary destructive loading={revokePush.isPending} onPress={() => Alert.alert('Disable push on this device?', 'This stops push alerts on this installation. Other devices remain unchanged.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Disable', style: 'destructive', onPress: () => revokePush.mutate(undefined, { onSuccess: () => setDeviceRegistered(false), onError: (error) => setSetupError(error instanceof Error ? error.message : 'Could not disable push notifications.') }) }])} /> : null}
      <NotificationInbox
        error={inbox.error ?? markRead.error ?? markAllRead.error}
        hasNextPage={inbox.hasNextPage}
        isLoading={inbox.isLoading}
        isLoadingMore={inbox.isFetchingNextPage}
        isMarkingAll={markAllRead.isPending}
        items={notifications}
        markingId={markRead.isPending ? markRead.variables : undefined}
        onLoadMore={() => inbox.fetchNextPage()}
        onMarkAllRead={() => markAllRead.mutate()}
        onMarkRead={(notificationId) => markRead.mutate(notificationId)}
      />
    </Screen>
  );
}

function PreferenceRow({
  title,
  description,
  value,
  disabled,
  onChange,
  colors,
}: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
  colors: ReturnType<typeof useAppTheme>['colors'];
}) {
  return (
    <View style={{ minHeight: 64, padding: 12, gap: 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.divider, opacity: disabled ? 0.55 : 1 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text selectable style={{ color: colors.text, fontSize: 17, lineHeight: 23 }}>{title}</Text>
        <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={description}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: colors.control, true: colors.brand }}
      />
    </View>
  );
}
