import { useLocalSearchParams } from 'expo-router';
import { ComingLaterScreen } from '@/features/coming-later/screen';

export default function GroupDetailScreen() {
  useLocalSearchParams<{ groupId: string }>();
  return <ComingLaterScreen eyebrow="GROUP LEDGER" title="Group ledgers are coming later" purpose="Expenses, settlements, members, and group balances need the financial backend before they can be shown truthfully." />;
}
