import { useLocalSearchParams } from 'expo-router';
import { ComingLaterScreen } from '@/features/coming-later/screen';
export default function GroupBalancesScreen() { useLocalSearchParams<{ groupId: string }>(); return <ComingLaterScreen eyebrow="GROUP BALANCES" title="Balances are coming later" purpose="Authoritative, per-currency group balances need the financial ledger APIs." />; }
