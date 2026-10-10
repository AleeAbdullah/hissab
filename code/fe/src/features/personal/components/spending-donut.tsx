import { PieChart } from 'react-native-gifted-charts';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SpendingPlotFrame } from '@/features/personal/components/spending-chart';
import {
  spendingRatio,
  spendingShareLabel
} from '@/features/personal/spending';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

// Single-hue ramp: the top categories step down in opacity, the rest share one neutral.
const RAMP_ALPHAS = [1, 0.72, 0.5, 0.32] as const;
const NEUTRAL_ALPHA = 0.35;

function withAlpha(color: string, alpha: number) {
  return alpha < 1 && /^#[0-9a-f]{6}$/i.test(color)
    ? `${color}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')}`
    : color;
}

function useCategoryColor() {
  const primary = useThemeVariable(THEME_VARIABLES.primary);
  const neutral = useThemeVariable(THEME_VARIABLES.mutedForeground);
  return (rank: number) =>
    rank < RAMP_ALPHAS.length
      ? withAlpha(primary, RAMP_ALPHAS[rank])
      : withAlpha(neutral, NEUTRAL_ALPHA);
}

// Decorative: category names and shares carry the meaning, so it is hidden from screen readers.
export function CategorySwatch({ rank }: { rank: number }) {
  const colorFor = useCategoryColor();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className="size-3 rounded-full"
      style={{ backgroundColor: colorFor(rank) }}
    />
  );
}

// `categories` must be sorted by amount, descending.
export function SpendingDonut({
  categories
}: {
  categories: { name: string; amountMinor: string }[];
}) {
  const colorFor = useCategoryColor();
  const card = useThemeVariable(THEME_VARIABLES.card);
  const total = categories
    .reduce((sum, category) => sum + BigInt(category.amountMinor), 0n)
    .toString();
  const top = categories.slice(0, RAMP_ALPHAS.length);
  const rest = categories.slice(RAMP_ALPHAS.length);
  const restTotal = rest
    .reduce((sum, category) => sum + BigInt(category.amountMinor), 0n)
    .toString();
  const slices = [
    ...top.map((category, rank) => ({
      value: spendingRatio(category.amountMinor, total) * 100,
      color: colorFor(rank)
    })),
    ...(rest.length
      ? [
          {
            value: spendingRatio(restTotal, total) * 100,
            color: colorFor(RAMP_ALPHAS.length)
          }
        ]
      : [])
  ].filter((slice) => slice.value > 0);
  const leader = categories[0];
  return (
    <SpendingPlotFrame>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Spending by category. ${categories.map((category) => `${category.name}: ${spendingShareLabel(category.amountMinor, total)}`).join('; ') || 'No spending recorded.'}`}
      >
        <PieChart
          data={
            slices.length
              ? slices
              : [{ value: 100, color: colorFor(RAMP_ALPHAS.length) }]
          }
          donut
          radius={92}
          innerRadius={64}
          innerCircleColor={card}
          strokeColor={card}
          strokeWidth={slices.length > 1 ? 2 : 0}
          isAnimated={false}
          centerLabelComponent={() => (
            <View className="max-w-[112px] items-center">
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
                className="text-center text-sm text-muted-foreground"
              >
                {leader?.name ?? 'No spending'}
              </Text>
              {leader ? (
                <Text
                  maxFontSizeMultiplier={1.3}
                  className="text-xl font-semibold"
                >
                  {spendingShareLabel(leader.amountMinor, total)}
                </Text>
              ) : null}
            </View>
          )}
        />
      </View>
    </SpendingPlotFrame>
  );
}
