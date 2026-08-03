import { useLocalSearchParams } from 'expo-router';
import { ComingLaterScreen } from '@/features/coming-later/screen';
export default function GroupBalancesScreen() { const { groupId } = useLocalSearchParams<{ groupId: string }>(); return <ComingLaterScreen purpose="Authoritative group balances need financial ledger APIs." links={[{ label: 'Simplified debts', href: { pathname: '/groups/[groupId]/simplified-debts', params: { groupId } } }, { label: 'Record settlement', href: '/settlement' }]} />; }
