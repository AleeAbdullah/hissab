import type { ConnectionRequest } from '@/api/contracts';
import { Avatar, Button, Card } from '@/components/ui';
import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export function ConnectionRequestCard({
  request,
  disabled,
  loading,
  onAccept,
  onDecline,
  onCancel,
}: {
  request: ConnectionRequest;
  disabled: boolean;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
}) {
  const { colors } = useAppTheme();
  const incoming = request.direction === 'incoming';
  return (
    <Card>
      <View style={{ padding: 16, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={request.personDisplayName} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 24, fontWeight: '600' }}>
              {request.personDisplayName}
            </Text>
            <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16 }}>
              {incoming ? 'Wants to connect with you' : 'Connection request sent'}
            </Text>
          </View>
        </View>
        {incoming ? (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}><Button title="Accept" disabled={disabled} loading={loading} onPress={onAccept} /></View>
            <View style={{ flex: 1 }}><Button title="Decline" secondary destructive disabled={disabled} onPress={onDecline} /></View>
          </View>
        ) : (
          <Button title="Cancel request" secondary destructive disabled={disabled} loading={loading} onPress={onCancel} />
        )}
      </View>
    </Card>
  );
}
