import { Redirect } from 'expo-router';

import { Loading } from '@/components/ui';
import { useSession } from '@/features/auth/session';
import { HomeScreen } from '@/features/home/screen';

export default function HomeRoute() {
  const session = useSession();
  if (session === undefined) return <Loading />;
  if (!session) return <Redirect href="/sign-in" />;
  return <HomeScreen />;
}
