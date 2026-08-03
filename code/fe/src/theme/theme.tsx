import { vars } from 'nativewind';
import type { PropsWithChildren } from 'react';
import { useColorScheme, View } from 'react-native';

type ColorName =
  | 'canvas'
  | 'surface'
  | 'surfaceSubtle'
  | 'text'
  | 'secondary'
  | 'divider'
  | 'control'
  | 'brand'
  | 'brandSubtle'
  | 'onBrand'
  | 'positive'
  | 'negative'
  | 'warning'
  | 'warningSubtle'
  | 'negativeSubtle';

export type AppColors = Record<ColorName, string>;

export const lightColors: AppColors = {
  canvas: '#F7F3EC',
  surface: '#FFFEFA',
  surfaceSubtle: '#EFE8DD',
  text: '#1D1D1B',
  secondary: '#665D55',
  divider: '#DDD4C8',
  control: '#8A7E73',
  brand: '#A83A1B',
  brandSubtle: '#F5E0D8',
  onBrand: '#FFFFFF',
  positive: '#2E7D59',
  negative: '#B42318',
  warning: '#9C5A12',
  warningSubtle: '#FBEED8',
  negativeSubtle: '#F9E4E1',
};

export const darkColors: AppColors = {
  canvas: '#1D1D1B',
  surface: '#272522',
  surfaceSubtle: '#332F2B',
  text: '#F7F3EC',
  secondary: '#C7BDB3',
  divider: '#49423C',
  control: '#91857A',
  brand: '#A83A1B',
  brandSubtle: '#4B281F',
  onBrand: '#FFFFFF',
  positive: '#77C79D',
  negative: '#FF9A90',
  warning: '#F3B66B',
  warningSubtle: '#3D2B13',
  negativeSubtle: '#432222',
};

export const spacing = { one: 4, two: 8, three: 12, four: 16, five: 20, six: 24, eight: 32 };
export const radii = { control: 12, surface: 16, sheet: 20 };

function nativeWindVariables(colors: AppColors) {
  return vars(Object.fromEntries(Object.entries(colors).map(([name, value]) => [`--color-${name}`, value])));
}

const themes = {
  light: { colors: lightColors, nativeWindVariables: nativeWindVariables(lightColors) },
  dark: { colors: darkColors, nativeWindVariables: nativeWindVariables(darkColors) },
};

export function useAppTheme() {
  const dark = useColorScheme() === 'dark';
  return { ...themes[dark ? 'dark' : 'light'], dark };
}

export function AppTheme({ children }: PropsWithChildren) {
  const { nativeWindVariables } = useAppTheme();
  return <View style={[{ flex: 1 }, nativeWindVariables]}>{children}</View>;
}
