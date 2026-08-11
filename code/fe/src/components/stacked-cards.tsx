import { SymbolView } from 'expo-symbols';
import { useState, type ReactNode } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { LinearTransition, ReduceMotion } from 'react-native-reanimated';

import { useAppTheme } from '@/theme/theme';

export type StackedCardItem = {
  id: string;
  frontContent: ReactNode;
  backContent: ReactNode;
  accessibilityLabel: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

type StackedCardsProps = {
  cards: readonly [StackedCardItem, StackedCardItem];
};

const CARD_MIN_HEIGHT = 136;
const CARD_OVERLAP = 80;
const CARD_TRANSITION = LinearTransition.duration(240).reduceMotion(ReduceMotion.System);

export function StackedCards({ cards }: StackedCardsProps) {
  const { colors } = useAppTheme();
  const [frontId, setFrontId] = useState(cards[1].id);
  const orderedCards = frontId === cards[0].id ? [cards[1], cards[0]] : [cards[0], cards[1]];
  const rearCard = orderedCards[0];

  return (
    <View>
      {orderedCards.map((card, index) => {
        const isFront = index === 1;

        return (
          <Animated.View
            key={card.id}
            className={card.className}
            layout={CARD_TRANSITION}
            style={[
              card.style,
              {
                minHeight: CARD_MIN_HEIGHT,
                marginTop: isFront ? -CARD_OVERLAP : 0,
                marginHorizontal: isFront ? 0 : 8,
                borderRadius: 16,
                borderCurve: 'continuous',
                overflow: 'hidden',
                zIndex: isFront ? 1 : 0,
              },
            ]}
          >
            <View
              accessibilityElementsHidden={!isFront}
              importantForAccessibility={isFront ? 'auto' : 'no-hide-descendants'}
              pointerEvents={isFront ? 'auto' : 'none'}
              style={{ flex: 1, minHeight: CARD_MIN_HEIGHT }}
            >
              {isFront ? card.frontContent : card.backContent}
            </View>
            {isFront ? (
              <Pressable
                accessibilityLabel={rearCard.accessibilityLabel}
                accessibilityRole="button"
                onPress={() => setFrontId(rearCard.id)}
                style={{ position: 'absolute', right: 12, bottom: 12, width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceSubtle, alignItems: 'center', justifyContent: 'center' }}
              >
                <SymbolView name={{ ios: 'arrow.up.arrow.down', android: 'swap_vert', web: 'swap_vert' }} size={20} tintColor={colors.secondary} />
              </Pressable>
            ) : (
              <Pressable
                accessibilityLabel={card.accessibilityLabel}
                accessibilityRole="button"
                onPress={() => setFrontId(card.id)}
                style={{ position: 'absolute', inset: 0 }}
              />
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}
