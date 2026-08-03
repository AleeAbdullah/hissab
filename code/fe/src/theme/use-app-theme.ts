import { useColorScheme } from 'react-native';

import { darkColors, lightColors } from './tokens';

export function useAppTheme() {
  const dark = useColorScheme() === 'dark';
  return { colors: dark ? darkColors : lightColors, dark };
}
