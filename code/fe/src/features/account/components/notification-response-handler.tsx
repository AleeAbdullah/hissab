import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';

import { queryClient } from '@/api/query-client';
import { markNotificationRead } from '@/features/account/api';
import { useSession } from '@/features/auth/session';
import { reminderLedgerHref } from '@/features/reminders/navigation';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false
  })
});

export default function NotificationResponseHandler() {
  const response = Notifications.useLastNotificationResponse();
  const session = useSession();
  const handledResponseId = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!response) {
      handledResponseId.current = undefined;
      return;
    }
    if (!session) return;
    const responseId = response.notification.request.identifier;
    if (handledResponseId.current === responseId) return;
    handledResponseId.current = responseId;
    const data = response.notification.request.content.data ?? {};
    if (data.recipientUserId === session.user.id) {
      router.push(reminderLedgerHref(data) ?? '/home/inbox');
      const notificationId = data.notificationId;
      if (typeof notificationId === 'string') {
        void markNotificationRead(notificationId)
          .catch(() => undefined)
          .finally(() =>
            queryClient.invalidateQueries({ queryKey: ['notifications'] })
          );
      }
    }
    void Notifications.clearLastNotificationResponseAsync();
  }, [response, session]);

  return null;
}
