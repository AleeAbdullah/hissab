import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';

import type { ConnectionRequest } from '@/api/contracts';
import { Avatar, Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { isolate } from '@/i18n';

export function ConnectionRequestCard({
  request,
  disabled,
  loading,
  onAccept,
  onDecline,
  onCancel,
  onReport,
  onBlock
}: {
  request: ConnectionRequest;
  disabled: boolean;
  loading: boolean;
  onAccept: () => void;
  onDecline: () => void;
  onCancel: () => void;
  onReport?: () => void;
  onBlock?: () => void;
}) {
  const { t } = useTranslation(['connections', 'common']);
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
              {incoming ? t('wantsToConnectWithYou') : t('friendRequestSent')}
            </Text>
          </View>
          {incoming && (onReport || onBlock) ? (
            <View className="shrink-0 flex-row gap-2">
              {onReport ? (
                <Button
                  size="compact"
                  variant="outline"
                  accessibilityLabel={t('report', {
                    name: isolate(request.personDisplayName)
                  })}
                  onPress={onReport}
                >
                  <Text>{t('report2')}</Text>
                </Button>
              ) : null}
              {onBlock ? (
                <Button
                  size="compact"
                  variant="destructiveOutline"
                  disabled={disabled}
                  accessibilityLabel={t('block', {
                    name: isolate(request.personDisplayName)
                  })}
                  onPress={onBlock}
                >
                  <Text>{t('block2')}</Text>
                </Button>
              ) : null}
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
                  <Text>{t('accept')}</Text>
                )}
              </Button>
            </View>
            <View className="flex-1">
              <Button
                variant="destructiveOutline"
                disabled={disabled}
                onPress={onDecline}
              >
                <Text>{t('decline')}</Text>
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
              <Text>{t('cancelRequest')}</Text>
            )}
          </Button>
        )}
      </View>
    </Card>
  );
}
