import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icons } from '@/components/icons';
import { Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { LARGE_TEXT_SCALE, useLargeText } from '@/lib/text-scale';

const illustration = {
  light: require('@/assets/images/welcome/tally-stick.png'),
  dark: require('@/assets/images/welcome/tally-stick-dark.png')
};

export default function WelcomeScreen() {
  const { t } = useTranslation(['auth', 'common']);
  const points = [
    t('splitEquallyOrExactly'),
    t('everyBalanceAddsUp'),
    t('recordPaymentsMadeAnywhere')
  ];
  const scheme = useColorScheme();
  const largeText = useLargeText();
  return (
    <SafeAreaView edges={['top', 'bottom']} className="flex-1 bg-background">
      <Screen>
        <View className="flex-grow justify-between gap-8">
          <View className="flex-grow justify-center gap-6 py-4">
            {/* Decorative: a split tally stick, the product's namesake. Hidden at large text so the actions stay in view. */}
            {largeText ? null : (
              <Image
                source={illustration[scheme === 'dark' ? 'dark' : 'light']}
                contentFit="contain"
                accessible={false}
                style={{ width: '100%', height: 190 }}
              />
            )}
            <View className="gap-4">
              {/* The wordmark is already display-sized; scaling it further splits the name mid-word. */}
              <Text
                selectable
                maxFontSizeMultiplier={LARGE_TEXT_SCALE}
                className="font-serif text-[56px] font-medium leading-[60px]"
              >
                {t('tallyStick')}
              </Text>
              <View className="h-px w-12 bg-primary" />
              <View className="gap-2">
                <Text
                  selectable
                  className="font-serif text-[32px] font-medium leading-[38px]"
                >
                  {t('keepTheRecordClear')}
                </Text>
                <Text
                  selectable
                  className="text-[15px] leading-[22px] text-muted-foreground"
                >
                  {t('sharedExpensesAndExactlyWhoOwesWhom')}
                </Text>
              </View>
            </View>
            <View className="gap-3">
              {points.map((point) => (
                <View key={point} className="flex-row items-center gap-3">
                  <Icon
                    as={Icons.check}
                    size={20}
                    className="text-primary"
                    accessibilityElementsHidden
                    importantForAccessibility="no"
                  />
                  <Text selectable className="flex-1 text-base leading-6">
                    {point}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <View className="gap-2.5">
            <Link href="/register" asChild>
              <Button role="link">
                <Text>{t('createAccount')}</Text>
              </Button>
            </Link>
            <Link href="/sign-in" asChild>
              <Button variant="outline" role="link">
                <Text>{t('signIn')}</Text>
              </Button>
            </Link>
            <Text
              selectable
              className="text-center text-xs leading-4 text-muted-foreground"
            >
              {t('tallyStickKeepsTheRecordItNeverMovesMoney')}
            </Text>
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}
