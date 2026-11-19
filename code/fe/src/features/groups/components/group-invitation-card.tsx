import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import type { GroupInvitation } from '@/api/contracts';
import { Avatar, Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { isolate } from '@/i18n';

export function GroupInvitationCard({
  invitation,
  loading,
  disabled = loading,
  onAccept,
  onDecline
}: {
  invitation: GroupInvitation;
  loading: boolean;
  disabled?: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const { t } = useTranslation(['groups', 'common']);
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
              {t('invitedBy', {
                name: isolate(invitation.invitedByDisplayName)
              })}
            </Text>
          </View>
        </View>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              disabled={disabled}
              accessibilityState={{ disabled, busy: loading }}
              onPress={onAccept}
            >
              {loading ? (
                <ActivityIndicator className="text-primary-foreground" />
              ) : (
                <Text>{t('accept')}</Text>
              )}
            </Button>
          </View>
          <View className="flex-1">
            <Button
              variant="destructiveOutline"
              disabled={disabled}
              accessibilityState={{ disabled }}
              onPress={onDecline}
            >
              <Text>{t('decline')}</Text>
            </Button>
          </View>
        </View>
      </View>
    </Card>
  );
}
