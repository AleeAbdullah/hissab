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
    // Socket.IO won't retry after a server-side disconnect (token expiry, listener
    // outage) or a rejected handshake, so retry with backoff. Refetching runs any
    // needed token refresh, and a new token recreates this socket.
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;
    const reconnectLater = () => {
      if (retry) return;
      retry = setTimeout(
        () => {
          retry = undefined;
          attempt += 1;
          refetchAuthoritativeState();
          socket.connect();
        },
        Math.min(30_000, 1_000 * 2 ** attempt)
      );
    };
    socket.on('connect', () => {
      attempt = 0;
      refetchAuthoritativeState();
    });
    socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') reconnectLater();
    });
    socket.on('connect_error', () => {
      if (!socket.active) reconnectLater();
    });
    socket.on('invalidate', refetchAuthoritativeState);
    socket.on('resync', refetchAuthoritativeState);
    const foreground = AppState.addEventListener('change', (state) => {
      if (state === 'active') refetchAuthoritativeState();
    });
    return () => {
      if (retry) clearTimeout(retry);
      foreground.remove();
      socket.disconnect();
    };
  }, [accessToken]);

  return children;
}
