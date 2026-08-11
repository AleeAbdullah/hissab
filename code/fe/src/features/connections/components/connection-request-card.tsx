import type { ConnectionRequest } from '@/api/contracts';
import { Avatar, Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { ActivityIndicator, View } from 'react-native';

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
  const incoming = request.direction === 'incoming';
  return (
    <Card>
      <View className="gap-3 p-4">
        <View className="flex-row items-center gap-3">
          <Avatar name={request.personDisplayName} />
          <View className="flex-1 gap-0.5">
            <Text selectable className="text-base font-semibold leading-6">
              {request.personDisplayName}
            </Text>
            <Text selectable className="text-xs leading-4 text-muted-foreground">
              {incoming ? 'Wants to connect with you' : 'Connection request sent'}
            </Text>
          </View>
        </View>
        {incoming ? (
          <View className="flex-row gap-2">
            <View className="flex-1"><Button disabled={disabled || loading} accessibilityState={{ disabled: disabled || loading, busy: loading }} onPress={onAccept}>{loading ? <ActivityIndicator className="text-primary-foreground" /> : <Text>Accept</Text>}</Button></View>
            <View className="flex-1"><Button variant="destructiveOutline" disabled={disabled} onPress={onDecline}><Text>Decline</Text></Button></View>
          </View>
        ) : (
          <Button variant="destructiveOutline" disabled={disabled || loading} accessibilityState={{ disabled: disabled || loading, busy: loading }} onPress={onCancel}>{loading ? <ActivityIndicator className="text-destructive" /> : <Text>Cancel request</Text>}</Button>
        )}
      </View>
    </Card>
  );
}
