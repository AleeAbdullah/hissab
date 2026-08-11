import { homeGetHome } from '@/api/generated/sdk.gen';
import type { Home } from '@/api/contracts';
import { request } from '@/api/transport';

export const homeQuery = {
  queryKey: ['home'] as const,
  queryFn: () => request<Home>(() => homeGetHome()),
  refetchOnReconnect: true,
};
