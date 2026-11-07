import { Search } from 'lucide-react-native';
import { View } from 'react-native';

import { Card } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export function DiscoveryFeedback({
  group = false,
  error = false,
  onRetry
}: {
  group?: boolean;
  error?: boolean;
  onRetry?: () => void;
}) {
  return (
    <Card>
      <View accessibilityLiveRegion="polite" className="gap-2 p-4">
        <Icon as={Search} size={24} className="text-muted-foreground" />
        <Text className="text-base font-semibold">
          {error ? "Couldn't search right now" : 'No match to show'}
        </Text>
        <Text className="text-[15px] leading-[22px] text-muted-foreground">
          {error
            ? 'Try again in a minute.'
            : "Check the spelling, or ask them which email they use for Tally Stick. For privacy, Tally Stick doesn't confirm whether an email has an account."}
        </Text>
        {group && !error ? (
          <Text className="text-[15px] leading-[22px] text-muted-foreground">
            You can also invite someone from your connections below.
          </Text>
        ) : null}
        {error && onRetry ? (
          <Button variant="outline" size="compact" onPress={onRetry}>
            <Text>Retry</Text>
          </Button>
        ) : null}
      </View>
    </Card>
  );
}
