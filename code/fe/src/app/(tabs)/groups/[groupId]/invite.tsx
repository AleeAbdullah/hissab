import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FormSheet, Notice, Screen } from '@/components/ui';
import { GroupInviteForm } from '@/features/groups/components/group-invite-form';

export default function GroupInviteScreen() {
  const { t } = useTranslation(['groups', 'common']);
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  return (
    <FormSheet
      title={t('inviteMembers')}
      action={{ label: t('close'), onPress: () => router.back() }}
    >
      {groupId ? (
        <GroupInviteForm groupId={groupId} />
      ) : (
        <Screen>
          <Notice title={t('groupUnavailable2')}>
            {t('openInvitationsFromAGroup')}
          </Notice>
        </Screen>
      )}
    </FormSheet>
  );
}
