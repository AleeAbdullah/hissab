import { ComingLaterScreen } from '@/features/coming-later/screen';
export default function EditExpenseScreen() { return <ComingLaterScreen purpose="Editing, deleting and conflict resolution need versioned expense mutations." links={[{ label: 'Configure payers', href: '/payers' }, { label: 'Configure split', href: '/split' }]} />; }
