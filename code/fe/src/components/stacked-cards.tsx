import { useState, type ReactNode } from 'react';
import { View } from 'react-native';
import Animated, {
  LinearTransition,
  ReduceMotion
} from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export type StackedCardItem = {
  id: string;
  frontContent: ReactNode;
  backContent: ReactNode;
  accessibilityLabel: string;
  className?: string;
};

type StackedCardsProps = {
  cards: readonly [StackedCardItem, StackedCardItem];
};

const CARD_TRANSITION = LinearTransition.duration(240).reduceMotion(
  ReduceMotion.System
);

export function StackedCards({ cards }: StackedCardsProps) {
  const [frontId, setFrontId] = useState(cards[1].id);
  const orderedCards =
    frontId === cards[0].id ? [cards[1], cards[0]] : [cards[0], cards[1]];
  const rearCard = orderedCards[0];

  return (
    <View>
      {orderedCards.map((card, index) => {
        const isFront = index === 1;
        return (
          <Animated.View
            key={card.id}
            layout={CARD_TRANSITION}
            className={cn(
              'min-h-[136px] rounded-2xl',
              isFront ? 'z-[1] mx-0 -mt-20' : 'z-0 mx-2 mt-0',
              card.className
            )}
          >
            <View
              accessibilityElementsHidden={!isFront}
              importantForAccessibility={
                isFront ? 'auto' : 'no-hide-descendants'
              }
              pointerEvents={isFront ? 'auto' : 'none'}
              className="min-h-[136px] flex-1"
            >
              {isFront ? card.frontContent : card.backContent}
            </View>
            {isFront ? (
              <Button
                variant="ghost"
                size="icon"
                accessibilityLabel={rearCard.accessibilityLabel}
                onPress={() => setFrontId(rearCard.id)}
                className="absolute bottom-3 right-3 size-10 rounded-full bg-muted"
              >
                <Icon
                  as={Icons.arrowUpDown}
                  size={20}
                  className="text-muted-foreground"
                />
              </Button>
            ) : (
              <Button
                variant="ghost"
                accessibilityLabel={card.accessibilityLabel}
                onPress={() => setFrontId(card.id)}
                className="absolute inset-0 rounded-none p-0 active:bg-transparent dark:active:bg-transparent"
              />
            )}
          </Animated.View>
        );
      })}
    </View>
  );
}
