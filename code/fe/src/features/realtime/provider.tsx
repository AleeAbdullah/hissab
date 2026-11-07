import { type PropsWithChildren, useEffect } from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';

import { queryClient } from '@/api/query-client';
import { apiBaseUrl } from '@/api/transport';
import { useSession } from '@/features/auth/session';

export function RealtimeProvider({ children }: PropsWithChildren) {
  const session = useSession();
  const accessToken = session?.accessToken;

  useEffect(() => {
    if (!accessToken) return;
    const socket = io(`${apiBaseUrl}/events`, {
      auth: { accessToken },
      transports: ['websocket']
    });
    const refetchAuthoritativeState = () =>
      void queryClient.invalidateQueries();
    socket.on('connect', refetchAuthoritativeState);
    socket.on('invalidate', refetchAuthoritativeState);
    socket.on('resync', refetchAuthoritativeState);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetchAuthoritativeState();
    });
    return () => {
      foreground.remove();
      socket.disconnect();
    };
  }, [accessToken]);

  return children;
}
