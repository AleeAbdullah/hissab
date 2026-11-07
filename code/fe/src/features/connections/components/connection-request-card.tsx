import { ActivityIndicator, View } from 'react-native';

import type { ConnectionRequest } from '@/api/contracts';
import { Avatar, Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function ConnectionRequestCard({
  request,
  disabled,
  loading,
  onAccept,
  onDecline,
  onCancel,
  onReport
}: {
  request: ConnectionRequest;
  disabled: boolean;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onReport?: () => void;
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
            <Text
              selectable
              className="text-xs leading-4 text-muted-foreground"
            >
              {incoming
                ? 'Wants to connect with you'
                : 'Connection request sent'}
            </Text>
          </View>
          {incoming && onReport ? (
            <View className="shrink-0">
              <Button
                size="compact"
                variant="outline"
                accessibilityLabel={`Report ${request.personDisplayName}`}
                onPress={onReport}
              >
                <Text>Report</Text>
              </Button>
            </View>
          ) : null}
        </View>
        {incoming ? (
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button
                disabled={disabled || loading}
                accessibilityState={{
                  disabled: disabled || loading,
                  busy: loading
                }}
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
                disabled={disabled}
                onPress={onDecline}
              >
                <Text>Decline</Text>
              </Button>
            </View>
          </View>
        ) : (
          <Button
            variant="destructiveOutline"
            disabled={disabled || loading}
            accessibilityState={{
              disabled: disabled || loading,
              busy: loading
            }}
            onPress={onCancel}
          >
            {loading ? (
              <ActivityIndicator className="text-destructive" />
            ) : (
              <Text>Cancel request</Text>
            )}
          </Button>
        )}
      </View>
    </Card>
  );
}
