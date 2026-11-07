import { useRef, useState } from 'react';
import { View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { formatMinorAmount } from '@/lib/money';

const THUMB_REGION = 48;

export function AmountRangeSlider({
  displayCurrency,
  maximumMinor,
  minimumMinor,
  upperMinor,
  onChange
}: {
  displayCurrency: DisplayCurrency;
  maximumMinor: string;
  minimumMinor: string;
  upperMinor: string;
  onChange: (minimum: string, maximum: string) => void;
}) {
  const [width, setWidth] = useState(0);
  const track = useRef<View>(null);
  const trackLeft = useRef(0);
  const moving = useRef<'minimum' | 'maximum'>('minimum');
  const limit = BigInt(maximumMinor);
  const minimum = BigInt(minimumMinor);
  const maximum = BigInt(upperMinor);
  const travel = Math.max(1, Math.round(width) - THUMB_REGION);
  const position = (value: bigint) =>
    THUMB_REGION / 2 + Number((value * BigInt(travel)) / limit);
  const minimumX = limit > 0n ? position(minimum) : THUMB_REGION / 2;
  const maximumX = limit > 0n ? position(maximum) : THUMB_REGION / 2;

  const move = (locationX: number) => {
    if (limit === 0n) return;
    const pixel = Math.max(
      0,
      Math.min(travel, Math.round(locationX - THUMB_REGION / 2))
    );
    const value = (limit * BigInt(pixel)) / BigInt(travel);
    if (moving.current === 'minimum')
      onChange(
        (value > maximum ? maximum : value).toString(),
        maximum.toString()
      );
    else
      onChange(
        minimum.toString(),
        (value < minimum ? minimum : value).toString()
      );
  };

  const adjust = (thumb: 'minimum' | 'maximum', direction: 1 | -1) => {
    const step = limit / 20n || 1n;
    const next =
      (thumb === 'minimum' ? minimum : maximum) + BigInt(direction) * step;
    if (thumb === 'minimum')
      onChange(
        (next < 0n ? 0n : next > maximum ? maximum : next).toString(),
        maximum.toString()
      );
    else
      onChange(
        minimum.toString(),
        (next < minimum ? minimum : next > limit ? limit : next).toString()
      );
  };

  return (
    <View
      ref={track}
      className="h-12 justify-center"
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width);
        track.current?.measureInWindow((x) => {
          trackLeft.current = x;
        });
      }}
      onStartShouldSetResponder={() => true}
      onResponderGrant={(event) => {
        const x = event.nativeEvent.pageX - trackLeft.current;
        const distanceMinimum = Math.abs(x - minimumX);
        const distanceMaximum = Math.abs(x - maximumX);
        moving.current =
          distanceMinimum < distanceMaximum ||
          (distanceMinimum === distanceMaximum && x < minimumX)
            ? 'minimum'
            : 'maximum';
        move(x);
      }}
      onResponderMove={(event) =>
        move(event.nativeEvent.pageX - trackLeft.current)
      }
    >
      <View className="mx-6 h-2 rounded-full bg-secondary" />
      {width > THUMB_REGION ? (
        <>
          <View
            className="bg-primary/50 absolute h-2 rounded-full"
            style={{
              left: minimumX,
              width: Math.max(0, maximumX - minimumX)
            }}
          />
          {[
            { kind: 'minimum' as const, x: minimumX, value: minimum },
            { kind: 'maximum' as const, x: maximumX, value: maximum }
          ].map((thumb) => (
            <View
              key={thumb.kind}
              className="absolute h-12 w-12 items-center justify-center"
              style={{ left: thumb.x - THUMB_REGION / 2 }}
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={`${thumb.kind} amount`}
              accessibilityValue={{
                text: formatMinorAmount(thumb.value.toString(), displayCurrency)
              }}
              accessibilityActions={[
                { name: 'increment' },
                { name: 'decrement' }
              ]}
              onAccessibilityAction={(event) =>
                adjust(
                  thumb.kind,
                  event.nativeEvent.actionName === 'increment' ? 1 : -1
                )
              }
            >
              <View className="h-8 w-4 rounded-md border-2 border-primary bg-card" />
            </View>
          ))}
        </>
      ) : null}
    </View>
  );
}
