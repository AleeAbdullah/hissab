import type { GroupInvitation } from '@/api/contracts';
import { Avatar, Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ActivityIndicator, View } from 'react-native';

export function GroupInvitationCard({
  invitation,
  loading,
  onAccept,
  onDecline
}: {
  invitation: GroupInvitation;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Card>
      <View className="gap-3 p-4">
        <View className="flex-row items-center gap-3">
          <Avatar name={invitation.groupName} />
          <View className="flex-1 gap-0.5">
            <Text selectable className="text-base font-semibold leading-6">
              {invitation.groupName}
            </Text>
            <Text
              selectable
              className="text-[13px] leading-[18px] text-muted-foreground"
            >
              Invited by {invitation.invitedByDisplayName}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              disabled={loading}
              accessibilityState={{ disabled: loading, busy: loading }}
              onPress={onAccept}
            >
              {loading ? (
                <ActivityIndicator className="text-primary-foreground" />
              ) : (
                <Text>Accept</Text>
              )}
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="destructiveOutline"
              disabled={loading}
              onPress={onDecline}
            >
              <Text>Decline</Text>
            </Button>
          </View>
        </View>
      </View>
    </Card>
  );
}
