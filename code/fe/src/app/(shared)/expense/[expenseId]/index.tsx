import { useLocalSearchParams } from 'expo-router';
import { ComingLaterScreen } from '@/features/coming-later/screen';
export default function ExpenseDetailScreen() { const { expenseId } = useLocalSearchParams<{ expenseId: string }>(); return <ComingLaterScreen purpose="Expense detail, receipt state and change history need the expense API." links={[{ label: 'Edit expense', href: { pathname: '/expense/[expenseId]/edit', params: { expenseId } } }, { label: 'View receipt', href: '/receipt' }]} />; }
