import { useLocalSearchParams } from 'expo-router';
import { ComingLaterScreen } from '@/features/coming-later/screen';
export default function TransactionDetailScreen() { const { transactionId } = useLocalSearchParams<{ transactionId: string }>(); return <ComingLaterScreen purpose="Transaction detail needs the private transaction API." links={[{ label: 'Edit transaction', href: { pathname: '/personal/[transactionId]/edit', params: { transactionId } } }]} />; }
