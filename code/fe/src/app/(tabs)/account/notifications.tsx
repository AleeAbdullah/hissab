import { useInfiniteQuery, useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Switch, View } from 'react-native';

import { queryClient } from '@/api/query-client';
import type { NotificationPreferences } from '@/api/contracts';
import { Card, ErrorMessage, Loading, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import {
  notificationPreferencesQuery,
  notificationInboxInfiniteQuery,
  markAllNotificationsRead,
  markNotificationRead,
  updateNotificationPreferences
} from '@/features/account/api';
import { NotificationInbox } from '@/features/account/components/notification-inbox';
import { useSession } from '@/features/auth/session';
import {
  canRegisterPushNotifications,
  hasRegisteredPushDevice,
  registerForPushNotifications,
  revokePushNotifications
} from '@/features/account/push';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';
import { cn } from '@/lib/utils';

type PreferenceKey = Exclude<keyof NotificationPreferences, 'updatedAt'>;

const options: { key: PreferenceKey; title: string; description: string }[] = [
  {
    key: 'pushEnabled',
    title: 'Push notifications',
    description: 'Receive Hissab alerts on this device.'
  },
  {
    key: 'expenseActivityEnabled',
    title: 'Expenses',
    description: 'New and updated shared expenses.'
  },
  {
    key: 'settlementActivityEnabled',
    title: 'Settlements',
    description: 'Recorded and updated settlements.'
  },
  {
    key: 'socialActivityEnabled',
    title: 'Social activity',
    description: 'Connection and group invitation updates.'
  },
  {
    key: 'remindersEnabled',
    title: 'Balance reminders',
    description: 'Manual reminders from people you owe.'
  }
];

export default function NotificationsScreen() {
  const control = useThemeVariable(THEME_VARIABLES.input);
  const primary = useThemeVariable(THEME_VARIABLES.primary);
  const session = useSession();
  const preferences = useQuery(notificationPreferencesQuery);
  const inbox = useInfiniteQuery(notificationInboxInfiniteQuery());
  const mutation = useMutation({ mutationFn: updateNotificationPreferences });
  const markRead = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });
  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
  });
  const revokePush = useMutation({
    mutationFn: () => revokePushNotifications(session?.user.id ?? '')
  });
  const [setupError, setSetupError] = useState<string>();
  const [deviceRegistered, setDeviceRegistered] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const registered = session?.user.id
        ? await hasRegisteredPushDevice(session.user.id).catch(() => false)
        : false;
      if (active) setDeviceRegistered(registered);
    })();
    return () => {
      active = false;
    };
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
      setSetupError(
        error instanceof Error
          ? error.message
          : 'Could not update notification settings.'
      );
    }
  };

  return (
    <Screen>
      {preferences.error ? <ErrorMessage error={preferences.error} /> : null}
      {!canRegisterPushNotifications() ? (
        <Notice title="Physical device required">
          Push registration is available in your Hissab development build on a
          physical iOS or Android device.
        </Notice>
      ) : null}
      {setupError ? (
        <Notice title="Could not enable push notifications" error>
          {setupError}
        </Notice>
      ) : null}
      {preferences.data ? (
        <Card>
          {options.map((option) => (
            <PreferenceRow
              key={option.key}
              title={option.title}
              description={option.description}
              value={preferences.data[option.key]}
              disabled={
                mutation.isPending ||
                (option.key === 'pushEnabled' &&
                  !canRegisterPushNotifications())
              }
              onChange={(value) => update(option.key, value)}
              controlColor={control}
              primaryColor={primary}
            />
          ))}
        </Card>
      ) : null}
      <Text
        selectable
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        Turning push notifications on asks your device for permission and
        securely registers this app installation with Hissab.
      </Text>
      {deviceRegistered ? (
        <Button
          variant="destructiveOutline"
          disabled={revokePush.isPending}
          accessibilityState={{
            disabled: revokePush.isPending,
            busy: revokePush.isPending
          }}
          onPress={() =>
            Alert.alert(
              'Disable push on this device?',
              'This stops push alerts on this installation. Other devices remain unchanged.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Disable',
                  style: 'destructive',
                  onPress: () =>
                    revokePush.mutate(undefined, {
                      onSuccess: () => setDeviceRegistered(false),
                      onError: (error) =>
                        setSetupError(
                          error instanceof Error
                            ? error.message
                            : 'Could not disable push notifications.'
                        )
                    })
                }
              ]
            )
          }
        >
          {revokePush.isPending ? (
            <ActivityIndicator className="text-destructive" />
          ) : (
            <Text>Disable push on this device</Text>
          )}
        </Button>
      ) : null}
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
  controlColor,
  primaryColor
}: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
  controlColor: string;
  primaryColor: string;
}) {
  return (
    <View
      className={cn(
        'min-h-16 flex-row items-center gap-3 border-b border-border p-3',
        disabled && 'opacity-[0.55]'
      )}
    >
      <View className="flex-1 gap-0.5">
        <Text selectable className="text-[17px] leading-[23px]">
          {title}
        </Text>
        <Text
          selectable
          className="text-[13px] leading-[18px] text-muted-foreground"
        >
          {description}
        </Text>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={description}
        value={value}
        disabled={disabled}
        onValueChange={onChange}
        trackColor={{ false: controlColor, true: primaryColor }}
      />
    </View>
  );
}
