import { dehydrate, hydrate } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

import { queryClient } from '@/api/query-client';
import { getSessionUserId, getTokens } from '@/api/session-store';
import { Loading } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import {
  readLocalValue,
  removeLocalValue,
  writeLocalValue
} from '@/features/local-data/store';

const CACHE_KEY = 'queries';
const MAX_AGE_MS = 24 * 60 * 60 * 1_000;
const CACHE_ROOTS = new Set([
  'activity',
  'balances',
  'blocks',
  'connection-requests',
  'connections',
  'expenses',
  'group-invitations',
  'groups',
  'home',
  'ledgers',
  'notification-inbox',
  'notification-preferences',
  'personal',
  'profile',
  'settlements',
  'shared-expense-categories'
]);

type QueryCacheSnapshot = {
  savedAt: number;
  state: ReturnType<typeof dehydrate>;
};

function persistQueries(userId: string) {
  if (getSessionUserId(getTokens()) !== userId) return;
  const state = dehydrate(queryClient, {
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' &&
      CACHE_ROOTS.has(String(query.queryKey[0]))
  });
  if (!state.queries.length) return removeLocalValue(userId, CACHE_KEY);
  writeLocalValue<QueryCacheSnapshot>(userId, CACHE_KEY, {
    savedAt: Date.now(),
    state
  });
}

export function PersistedQueryProvider({ children }: PropsWithChildren) {
  const session = useSession();
  const userId = getSessionUserId(session);
  const [readyUserId, setReadyUserId] = useState<string | null | undefined>(
    undefined
  );
  const ready = session !== undefined && readyUserId === userId;

  useEffect(() => {
    let active = true;
    queryClient.clear();
    void (async () => {
      if (userId) {
        const snapshot = await readLocalValue<QueryCacheSnapshot>(
          userId,
          CACHE_KEY
        );
        if (snapshot && Date.now() - snapshot.savedAt <= MAX_AGE_MS && active)
          hydrate(queryClient, snapshot.state);
        else if (snapshot) removeLocalValue(userId, CACHE_KEY);
      }
      if (active) setReadyUserId(userId);
    })();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!userId || !ready) return;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => persistQueries(userId), 400);
    });
    return () => {
      if (timeout) clearTimeout(timeout);
      unsubscribe();
    };
  }, [ready, userId]);

  if (session === undefined || !ready) return <Loading />;
  return children;
}
