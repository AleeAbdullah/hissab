import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useState
} from 'react';

import type { AuthTokens, Profile } from '@/api/contracts';
import { queryClient } from '@/api/query-client';
import { getTokens, hydrateTokens, subscribeTokens } from '@/api/session-store';
import { syncLocale } from '@/i18n';
import { isLocale } from '@/i18n/locale';

const SessionContext = createContext<AuthTokens | null | undefined>(undefined);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState(getTokens());
  useEffect(() => {
    const unsubscribe = subscribeTokens(() => {
      const tokens = getTokens();
      setSession(tokens);
      if (tokens) void queryClient.invalidateQueries({ queryKey: ['profile'] });
    });
    const unsubscribeProfile = queryClient
      .getQueryCache()
      .subscribe((event) => {
        // Only successful server reads may override the persisted session preference.
        if (
          event.type !== 'updated' ||
          event.action.type !== 'success' ||
          event.action.manual ||
          event.query.queryKey[0] !== 'profile'
        )
          return;
        const profile = event.query.state.data as Profile | undefined;
        const tokens = getTokens();
        if (
          !tokens ||
          tokens.user.id !== profile?.id ||
          !isLocale(profile.locale)
        )
          return;
        void syncLocale(profile.locale).catch(() => undefined);
      });
    void hydrateTokens();
    return () => {
      unsubscribe();
      unsubscribeProfile();
    };
  }, []);

  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession() {
  return use(SessionContext);
}
