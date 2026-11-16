import { router, useLocalSearchParams } from 'expo-router';

import { FormSheet, Notice, Screen } from '@/components/ui';
import { GroupInviteForm } from '@/features/groups/components/group-invite-form';

export default function GroupInviteScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  return (
    <FormSheet
      title="Invite members"
      action={{ label: 'Close', onPress: () => router.back() }}
    >
      {groupId ? (
        <GroupInviteForm groupId={groupId} />
      ) : (
        <Screen>
          <Notice title="Group unavailable">
            Open invitations from a group.
          </Notice>
        </Screen>
      )}
    </FormSheet>
  );
}
