import { ComingLaterScreen } from '@/features/coming-later/screen';

export default function GroupsScreen() {
  return <ComingLaterScreen eyebrow="GROUPS" title="Groups are coming later" purpose="A group is a shared ledger for a trip, home, or recurring plan." note="This build has no group, membership, or group-ledger APIs yet, so no group data is shown." actionLabel="Create group · coming later" />;
}
