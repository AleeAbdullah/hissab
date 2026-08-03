import { useLocalSearchParams } from 'expo-router';

import { ComingLaterScreen } from '@/features/coming-later/screen';

export default function FriendSettingsScreen() {
  useLocalSearchParams<{ friendId: string }>();
  return <ComingLaterScreen purpose="Blocking from a friend ledger is unavailable until Hissab can show the authoritative outstanding balance in its confirmation." links={[{ label: 'View blocked people', href: '/friends/blocked' }]} />;
}
