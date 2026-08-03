import { ComingLaterScreen } from '@/features/coming-later/screen';

export default function GroupsScreen() {
  return <ComingLaterScreen purpose="Groups need ledger and membership APIs before any group records can be shown." links={[{ label: 'Create group', href: '/group-new' }, { label: 'Preview group destinations', href: '/groups/coming-later' }]} />;
}
