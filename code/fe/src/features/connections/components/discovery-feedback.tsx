import { Search } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['connections', 'common']);
  return (
    <Card>
      <View accessibilityLiveRegion="polite" className="gap-2 p-4">
        <Icon as={Search} size={24} className="text-muted-foreground" />
        <Text className="text-base font-semibold">
          {error ? t('couldnTSearchRightNow') : t('noMatchToShow')}
        </Text>
        <Text className="text-[15px] leading-[22px] text-muted-foreground">
          {error
            ? t('tryAgainInAMinute')
            : t('checkTheSpellingOrAskThemWhichEmailTheyUse')}
        </Text>
        {group && !error ? (
          <Text className="text-[15px] leading-[22px] text-muted-foreground">
            {t('youCanAlsoInviteSomeoneFromYourFriendsBelow')}
          </Text>
        ) : null}
        {error && onRetry ? (
          <Button variant="outline" size="compact" onPress={onRetry}>
            <Text>{t('retry')}</Text>
          </Button>
        ) : null}
      </View>
    </Card>
  );
}
