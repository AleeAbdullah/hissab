import { ComingLaterScreen } from '@/features/coming-later/screen';
export default function TransactionsScreen() { return <ComingLaterScreen purpose="Personal transaction history needs the private transaction API." links={[{ label: 'Add transaction', href: '/personal-transaction' }, { label: 'Transaction details', href: '/personal/coming-later' }]} />; }
