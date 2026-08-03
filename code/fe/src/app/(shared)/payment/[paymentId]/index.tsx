import { useLocalSearchParams } from 'expo-router';
import { ComingLaterScreen } from '@/features/coming-later/screen';
export default function PaymentDetailScreen() { const { paymentId } = useLocalSearchParams<{ paymentId: string }>(); return <ComingLaterScreen purpose="Payment detail and deletion need the settlement API." links={[{ label: 'Edit payment', href: { pathname: '/payment/[paymentId]/edit', params: { paymentId } } }]} />; }
