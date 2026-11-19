import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

export default function NotificationsScreen() {
  const { t } = useTranslation(['account', 'common']);
  const options: { key: PreferenceKey; title: string; description: string }[] =
    [
      {
        key: 'pushEnabled',
        title: t('pushNotifications'),
        description: t('receiveTallyStickAlertsOnThisDevice')
      },
      {
        key: 'expenseActivityEnabled',
        title: t('expenses'),
        description: t('newAndUpdatedSharedExpenses')
      },
      {
        key: 'settlementActivityEnabled',
        title: t('settlements'),
        description: t('recordedAndUpdatedSettlements')
      },
      {
        key: 'socialActivityEnabled',
        title: t('socialActivity'),
        description: t('connectionAndGroupInvitationUpdates')
      },
      {
        key: 'remindersEnabled',
        title: t('balanceReminders'),
        description: t('manualRemindersFromPeopleYouOwe')
      }
    ];
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
          : t('couldNotUpdateNotificationSettings')
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
            <Text>{t('common:tryAgain')}</Text>
          </Button>
        </View>
      ) : null}
      {setupError ? (
        <Notice title={t('couldNotUpdateNotifications')} error>
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
        {t('theseChooseWhichAlertsPushSendsTheInboxShows')}
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
              t('disablePushOnThisDevice'),
              t('thisStopsPushAlertsOnThisInstallationOtherDevices'),
              [
                { text: t('common:cancel'), style: 'cancel' },
                {
                  text: t('disable'),
                  style: 'destructive',
                  onPress: () =>
                    revokePush.mutate(undefined, {
                      onSuccess: () => setDeviceRegistered(false),
                      onError: (error) =>
                        setSetupError(
                          error instanceof Error
                            ? error.message
                            : t('couldNotDisablePushNotifications')
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
            <Text>{t('disablePushOnThisDevice2')}</Text>
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
  const { t } = useTranslation(['account', 'common']);
  return (
    <View className="gap-2 border-b border-border p-4">
      <View className="min-h-12 flex-row items-center gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-[17px] leading-[23px]">{title}</Text>
          <Text className="text-[13px] leading-[18px] text-muted-foreground">
            {description}
          </Text>
        </View>
        <ThemedSwitch
          accessibilityLabel={title}
          accessibilityHint={
            unavailable
              ? t('pushIsntAvailableInThisVersionOfTallyStick')
              : description
          }
          value={value}
          disabled={disabled}
          onValueChange={onChange}
        />
      </View>
      {unavailable ? (
        <Text className="text-[13px] leading-[18px] text-muted-foreground">
          {t('pushIsntAvailableInThisVersionOfTallyStick')}
        </Text>
      ) : null}
    </View>
  );
}
