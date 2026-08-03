import { useLocalSearchParams } from 'expo-router';
import { ComingLaterScreen } from '@/features/coming-later/screen';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  return <ComingLaterScreen purpose="The group ledger will appear when group and expense APIs are available." links={[{ label: 'Add expense', href: '/shared-expense' }, { label: 'Balances', href: { pathname: '/groups/[groupId]/balances', params: { groupId } } }, { label: 'Members', href: { pathname: '/groups/[groupId]/members', params: { groupId } } }, { label: 'Group settings', href: { pathname: '/groups/[groupId]/settings', params: { groupId } } }, { label: 'Edit group', href: { pathname: '/groups/[groupId]/edit', params: { groupId } } }]} />;
}
