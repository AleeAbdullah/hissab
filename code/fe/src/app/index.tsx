import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useSession } from '@/features/auth/session';

export default function Index() {
  const session = useSession();
  if (session === undefined) return <Loading />;
  return <Redirect href={session ? '/friends' : '/welcome'} />;
}
