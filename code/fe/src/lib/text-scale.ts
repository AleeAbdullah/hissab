import { useWindowDimensions } from 'react-native';

// Above this font scale, side-by-side rows stack so values stay readable.
export const LARGE_TEXT_SCALE = 1.3;

export function useLargeText() {
  const { fontScale } = useWindowDimensions();
  return fontScale >= LARGE_TEXT_SCALE;
}
