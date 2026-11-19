import { useQuery } from '@tanstack/react-query';

import { profileQuery } from '@/features/account/api';
import { useSession } from '@/features/auth/session';

export function ProfileLocaleSync() {
  const session = useSession();
  useQuery({
    ...profileQuery,
    enabled: !!session,
    refetchOnMount: 'always'
  });
  return null;
}
