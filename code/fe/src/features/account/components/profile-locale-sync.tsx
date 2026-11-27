import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { queryClient } from '@/api/query-client';
import { getTokens } from '@/api/session-store';
import { profileQuery, updateProfile } from '@/features/account/api';
import { useSession } from '@/features/auth/session';
import { clearDeviceSync, pendingDeviceLocale } from '@/i18n';

export function ProfileLocaleSync() {
  const session = useSession();
  const [pending, setPending] = useState(pendingDeviceLocale);
  // A language picked in iOS Settings (or a new phone language) reaches the
  // profile first, so the older server value cannot replace it.
  useEffect(() => {
    if (!session || !pending) return;
    const userId = getTokens()?.user.id;
    let active = true;
    updateProfile({ locale: pending })
      .then((profile) => {
        if (!active || profile.id !== userId) return;
        clearDeviceSync();
        queryClient.setQueryData(profileQuery.queryKey, profile);
        setPending(null);
      })
      // Offline: keep the pending change and retry on the next launch.
      .catch(() => active && setPending(null));
    return () => {
      active = false;
    };
  }, [session, pending]);
  useQuery({
    ...profileQuery,
    enabled: !!session && !pending,
    refetchOnMount: 'always'
  });
  return null;
}
