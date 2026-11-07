import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import type { NotificationPreferences } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { Card, ErrorMessage, Loading, Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { ThemedSwitch } from '@/components/ui/switch';
import { Text } from '@/components/ui/text';
import {
  notificationPreferencesQuery,
  updateNotificationPreferences
} from '@/features/account/api';
import {
  canRegisterPushNotifications,
  hasRegisteredPushDevice,
  registerForPushNotifications,
  revokePushNotifications
} from '@/features/account/push';
import { useSession } from '@/features/auth/session';

type PreferenceKey = Exclude<keyof NotificationPreferences, 'updatedAt'>;

const options: { key: PreferenceKey; title: string; description: string }[] = [
  {
    key: 'pushEnabled',
    title: 'Push notifications',
    description: 'Receive Tally Stick alerts on this device.'
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
  const dialog = useDialog();
  const session = useSession();
  const preferences = useQuery(notificationPreferencesQuery);
  const mutation = useMutation({ mutationFn: updateNotificationPreferences });
  const revokePush = useMutation({
    mutationFn: () => revokePushNotifications(session?.user.id ?? '')
  });
  const [setupError, setSetupError] = useState<string>();
  const [deviceRegistered, setDeviceRegistered] = useState(false);
  const updating = useRef(false);
  const [isUpdating, setIsUpdating] = useState(false);

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
  const update = async (key: PreferenceKey, value: boolean) => {
    if (updating.current || revokePush.isPending) return;
    updating.current = true;
    setIsUpdating(true);
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
    } finally {
      updating.current = false;
      setIsUpdating(false);
    }
  };

  return (
    <Screen>
      {preferences.error ? (
        <View className="gap-3">
          <ErrorMessage error={preferences.error} />
          <Button
            variant="outline"
            disabled={preferences.isFetching}
            onPress={() => preferences.refetch()}
          >
            <Text>Try again</Text>
          </Button>
        </View>
      ) : null}
      {setupError ? (
        <Notice title="Could not update notifications" error>
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
              value={
                option.key === 'pushEnabled' && !canRegisterPushNotifications()
                  ? false
                  : preferences.data[option.key]
              }
              disabled={
                isUpdating ||
                revokePush.isPending ||
                (option.key === 'pushEnabled' &&
                  !canRegisterPushNotifications())
              }
              onChange={(value) => update(option.key, value)}
              unavailable={
                option.key === 'pushEnabled' && !canRegisterPushNotifications()
              }
            />
          ))}
        </Card>
      ) : null}
      <Text
        selectable
        className="text-[13px] leading-[18px] text-muted-foreground"
      >
        These choose which alerts push sends. The inbox shows everything.
      </Text>
      {deviceRegistered ? (
        <Button
          variant="destructiveOutline"
          disabled={revokePush.isPending || isUpdating}
          accessibilityState={{
            disabled: revokePush.isPending || isUpdating,
            busy: revokePush.isPending
          }}
          onPress={() =>
            dialog(
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
    </Screen>
  );
}

function PreferenceRow({
  title,
  description,
  value,
  disabled,
  onChange,
  unavailable
}: {
  title: string;
  description: string;
  value: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
  unavailable: boolean;
}) {
  return (
    <View className="gap-2 border-b border-border p-4">
      <View className="min-h-12 flex-row items-center gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-base leading-6">{title}</Text>
          <Text className="text-[13px] leading-[18px] text-muted-foreground">
            {description}
          </Text>
        </View>
        <ThemedSwitch
          accessibilityLabel={title}
          accessibilityHint={
            unavailable
              ? "Push isn't available in this version of Tally Stick. Your inbox still gets every update."
              : description
          }
          value={value}
          disabled={disabled}
          onValueChange={onChange}
        />
      </View>
      {unavailable ? (
        <Text className="text-[13px] leading-[18px] text-muted-foreground">
          {
            "Push isn't available in this version of Tally Stick. Your inbox still gets every update."
          }
        </Text>
      ) : null}
    </View>
  );
}
