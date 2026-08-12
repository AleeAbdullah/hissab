import {
  createContext,
  type PropsWithChildren,
  use,
  useEffect,
  useState
} from 'react';

import type { AuthTokens } from '@/api/contracts';
import { getTokens, hydrateTokens, subscribeTokens } from '@/api/session-store';

const SessionContext = createContext<AuthTokens | null | undefined>(undefined);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState(getTokens());

  useEffect(() => {
    const unsubscribe = subscribeTokens(() => setSession(getTokens()));
    void hydrateTokens();
    return unsubscribe;
  }, []);

  return <SessionContext value={session}>{children}</SessionContext>;
}

export function useSession() {
  return use(SessionContext);
}
