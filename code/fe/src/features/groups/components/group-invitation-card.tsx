import type { GroupInvitation } from '@/api/contracts';
import { Avatar, Button, Card } from '@/components/ui';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export function GroupInvitationCard({
  invitation,
  loading,
  onAccept,
  onDecline,
}: {
  invitation: GroupInvitation;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { colors } = useAppTheme();
  return (
    <Card>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={invitation.groupName} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>
              {invitation.groupName}
            </Text>
            <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>
              Invited by {invitation.invitedByDisplayName}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Button title="Accept" loading={loading} disabled={loading} onPress={onAccept} /></View>
          <View style={{ flex: 1 }}><Button title="Decline" secondary destructive disabled={loading} onPress={onDecline} /></View>
        </View>
      </View>
    </Card>
  );
}
