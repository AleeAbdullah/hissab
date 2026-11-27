import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

import { queryClient } from '@/api/query-client';
import { useDialog } from '@/components/ui/dialog';
import { notificationPreferencesQuery } from '@/features/account/api';
import {
  claimPushOffer,
  pushDeviceQuery,
  registerForPushNotifications
} from '@/features/account/push';
import { useSession } from '@/features/auth/session';

// New accounts default to push on, but a phone only receives pushes after it
// registers. Offer that once, from an in-app prompt, so the OS permission
// request stays user-triggered.
export function PushRegistrationPrompt() {
  const { t } = useTranslation(['account', 'common']);
  const dialog = useDialog();
  const userId = useSession()?.user.id;
  const preferences = useQuery({
    ...notificationPreferencesQuery,
    enabled: !!userId
  });
  const device = useQuery({
    ...pushDeviceQuery(userId ?? ''),
    enabled: !!userId
  });
  const offeredFor = useRef<string | undefined>(undefined);
  const pushEnabled = preferences.data?.pushEnabled;
  const registered = device.data;

  useEffect(() => {
    if (!userId || offeredFor.current === userId) return;
    if (pushEnabled !== true || registered !== false) return;
    offeredFor.current = userId;
    void (async () => {
      if (!(await claimPushOffer(userId).catch(() => false))) return;
      dialog(t('turnOnNotificationsTitle'), t('turnOnNotificationsBody'), [
        { text: t('notNow'), style: 'cancel' },
        {
          text: t('turnOn'),
          onPress: () => {
            registerForPushNotifications(userId)
              .then(() =>
                queryClient.setQueryData(pushDeviceQuery(userId).queryKey, true)
              )
              .catch((error: unknown) =>
                dialog(
                  t('couldNotUpdateNotifications'),
                  error instanceof Error
                    ? error.message
                    : t('couldNotUpdateNotificationSettings'),
                  [{ text: t('common:done') }],
                  { tone: 'error' }
                )
              );
          }
        }
      ]);
    })();
  }, [dialog, pushEnabled, registered, t, userId]);

  return null;
}
