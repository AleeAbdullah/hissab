import { useState, type PropsWithChildren } from 'react';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { View } from 'react-native';

import type { DisplayCurrency, PersonalReportBucket } from '@/api/contracts';
import { Text } from '@/components/ui/text';
import { periodLabel } from '@/features/personal/form';
import {
  SPENDING_COMPACT_PLOT_HEIGHT,
  SPENDING_PLOT_HEIGHT,
  spendingAxisLabel,
  spendingPoints,
  spendingRatio,
  spendingSeriesName,
  type SpendingBucket
} from '@/features/personal/spending';
import { cn, formatMinorAmount } from '@/lib/utils';
import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

const SCALE_STRIP_HEIGHT = 24;
const AXIS_LABEL_WIDTH = 64;
// gap-2 (8) + one 16-point text-xs line.
const AXIS_LABELS_HEIGHT = 24;

// Fixed-height placeholder for non-chart states. It spans the plot, the gap, and
// the axis-label row, so loading, error, donut, and chart states are the same height.
export function SpendingPlotFrame({
  compact = false,
  children
}: PropsWithChildren<{ compact?: boolean }>) {
  return (
    <View
      className="items-center justify-center"
      style={{
        height:
          (compact ? SPENDING_COMPACT_PLOT_HEIGHT : SPENDING_PLOT_HEIGHT) +
          AXIS_LABELS_HEIGHT
      }}
    >
      {children}
    </View>
  );
}

export function SpendingChart({
  buckets,
  range,
  bucket = 'DAY',
  displayCurrency,
  variant = 'line',
  compact = false,
  emptyLabel
}: {
  buckets: PersonalReportBucket[];
  range: { from: string; to: string };
  bucket?: SpendingBucket;
  displayCurrency: DisplayCurrency;
  variant?: 'line' | 'bar';
  compact?: boolean;
  emptyLabel: string;
}) {
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const primary = useThemeVariable(THEME_VARIABLES.primary);
  const border = useThemeVariable(THEME_VARIABLES.border);
  const points = spendingPoints(buckets, range, bucket);
  const total = points.at(-1)?.totalMinor ?? '0';
  const hasSpending = BigInt(total) > 0n;
  const isBar = variant === 'bar';
  const maximum = isBar
    ? points
        .reduce(
          (max, point) =>
            BigInt(point.amountMinor) > max ? BigInt(point.amountMinor) : max,
          0n
        )
        .toString()
    : total;
  const plotHeight = compact
    ? SPENDING_COMPACT_PLOT_HEIGHT
    : SPENDING_PLOT_HEIGHT;
  const chartHeight = compact ? plotHeight : plotHeight - SCALE_STRIP_HEIGHT;
  const width = Math.floor(measuredWidth);
  const slot = width / Math.max(points.length, 1);
  const barWidth = Math.min(40, Math.max(3, slot * 0.6));
  // The first and last labels sit on the plot edges; the middle one follows its
  // data point (a bar centre, or the end of its bucket on the cumulative line).
  const middle = Math.floor((points.length - 1) / 2);
  const labels = [
    ...new Set(
      compact ? [0, points.length - 1] : [0, middle, points.length - 1]
    )
  ].map((index) => ({
    text: spendingAxisLabel(points[index].period, bucket),
    x: isBar ? (index + 0.5) * slot : (index + 1) * slot
  }));
  const sharedAxisProps = {
    width,
    height: chartHeight,
    maxValue: 100,
    noOfSections: 3,
    yAxisLabelWidth: 0,
    yAxisThickness: 0,
    yAxisExtraHeight: 0,
    hideYAxisText: true,
    xAxisColor: border,
    xAxisThickness: 1,
    hideRules: compact,
    rulesColor: border,
    rulesType: 'solid' as const,
    initialSpacing: 0,
    endSpacing: 0,
    disableScroll: true,
    isAnimated: false
  };

  return (
    <View
      className="gap-2"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${spendingSeriesName(variant, bucket)} spending, ${formatMinorAmount(total, displayCurrency)}. ${
        points
          .filter((point) => BigInt(point.amountMinor) > 0n)
          .map(
            (point) =>
              `${periodLabel(point.period, bucket)}: ${formatMinorAmount(point.amountMinor, displayCurrency)}`
          )
          .join('; ') || 'No spending recorded.'
      }`}
    >
      <View
        style={{ height: plotHeight }}
        onLayout={(event) => setMeasuredWidth(event.nativeEvent.layout.width)}
      >
        {!hasSpending ? (
          <View className="flex-1 items-center justify-center border-b border-border">
            <Text className="text-center text-sm text-muted-foreground">
              {emptyLabel}
            </Text>
          </View>
        ) : (
          <>
            {compact ? null : (
              <View
                className="justify-center"
                style={{ height: SCALE_STRIP_HEIGHT }}
              >
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.5}
                  className="text-xs text-muted-foreground"
                >
                  {formatMinorAmount(maximum, displayCurrency)}
                </Text>
              </View>
            )}
            {width > 0 ? (
              <View style={{ height: chartHeight }}>
                {isBar ? (
                  <BarChart
                    {...sharedAxisProps}
                    data={points.map((point) => ({
                      value:
                        BigInt(point.amountMinor) > 0n
                          ? Math.max(
                              1,
                              spendingRatio(point.amountMinor, maximum) * 100
                            )
                          : 0
                    }))}
                    barWidth={barWidth}
                    spacing={slot - barWidth}
                    initialSpacing={(slot - barWidth) / 2}
                    barBorderTopLeftRadius={3}
                    barBorderTopRightRadius={3}
                    frontColor={primary}
                  />
                ) : (
                  <LineChart
                    {...sharedAxisProps}
                    // Cumulative spend starts at zero, so the line always has two points.
                    data={[
                      { value: 0 },
                      ...points.map((point) => ({
                        value: spendingRatio(point.totalMinor, total) * 100
                      }))
                    ]}
                    spacing={width / points.length}
                    color={primary}
                    thickness={2}
                    hideDataPoints
                    areaChart
                    startFillColor={primary}
                    endFillColor={primary}
                    startOpacity={0.18}
                    endOpacity={0}
                  />
                )}
              </View>
            ) : null}
          </>
        )}
      </View>
      <AxisLabels labels={labels} width={width} />
    </View>
  );
}

// Fixed-width label boxes laid out in flow, so wrapped text at large font
// sizes still grows the row instead of overlapping what follows.
function AxisLabels({
  labels,
  width
}: {
  labels: { text: string; x: number }[];
  width: number;
}) {
  const lefts = labels.map((label, index) =>
    index === 0
      ? 0
      : index === labels.length - 1
        ? Math.max(width - AXIS_LABEL_WIDTH, 0)
        : Math.min(
            Math.max(label.x - AXIS_LABEL_WIDTH / 2, 0),
            Math.max(width - AXIS_LABEL_WIDTH, 0)
          )
  );
  return (
    <View className="min-h-4 flex-row">
      {width > 0
        ? labels.map((label, index) => (
            <Text
              key={index}
              className={cn(
                'text-xs text-muted-foreground',
                index === 0
                  ? 'text-left'
                  : index === labels.length - 1
                    ? 'text-right'
                    : 'text-center'
              )}
              style={{
                width: AXIS_LABEL_WIDTH,
                marginLeft:
                  lefts[index] -
                  (index === 0 ? 0 : lefts[index - 1] + AXIS_LABEL_WIDTH)
              }}
            >
              {label.text}
            </Text>
          ))
        : null}
    </View>
  );
}
