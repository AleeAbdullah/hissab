import { Image } from 'expo-image';
import { Link } from 'expo-router';
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

const points = [
  'Split equally or exactly',
  'Every balance adds up',
  'Record payments made anywhere'
];

export default function WelcomeScreen() {
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
                Tally Stick
              </Text>
              <View className="h-px w-12 bg-primary" />
              <View className="gap-2">
                <Text
                  selectable
                  className="font-serif text-[32px] font-medium leading-[38px]"
                >
                  Keep the record clear.
                </Text>
                <Text
                  selectable
                  className="text-[15px] leading-[22px] text-muted-foreground"
                >
                  Shared expenses, and exactly who owes whom.
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
                <Text>Create account</Text>
              </Button>
            </Link>
            <Link href="/sign-in" asChild>
              <Button variant="outline" role="link">
                <Text>Sign in</Text>
              </Button>
            </Link>
            <Text
              selectable
              className="text-center text-xs leading-4 text-muted-foreground"
            >
              Tally Stick keeps the record. It never moves money.
            </Text>
          </View>
        </View>
      </Screen>
    </SafeAreaView>
  );
}
