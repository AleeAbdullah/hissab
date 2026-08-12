import {
  DarkTheme,
  DefaultTheme,
  type Theme
} from 'expo-router/react-navigation';
import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useUnstableNativeVariable } from 'nativewind';

export const THEME_VARIABLES = {
  background: '--background',
  foreground: '--foreground',
  card: '--card',
  popover: '--popover',
  primary: '--primary',
  secondary: '--secondary',
  muted: '--muted',
  accent: '--accent',
  destructive: '--destructive',
  border: '--border',
  input: '--input',
  ring: '--ring',
  radius: '--radius'
} as const;

export const NAV_THEME_VARIABLES = {
  background: THEME_VARIABLES.background,
  border: THEME_VARIABLES.border,
  card: THEME_VARIABLES.card,
  notification: THEME_VARIABLES.destructive,
  primary: THEME_VARIABLES.primary,
  text: THEME_VARIABLES.foreground
} as const;

export type ThemeVariable =
  (typeof THEME_VARIABLES)[keyof typeof THEME_VARIABLES];

export function useThemeVariable(variable: ThemeVariable) {
  return (useUnstableNativeVariable(variable) ?? `var(${variable})`) as string;
}

export function useNavigationTheme(): Theme {
  const scheme = useColorScheme();
  const background = useThemeVariable(NAV_THEME_VARIABLES.background);
  const border = useThemeVariable(NAV_THEME_VARIABLES.border);
  const card = useThemeVariable(NAV_THEME_VARIABLES.card);
  const notification = useThemeVariable(NAV_THEME_VARIABLES.notification);
  const primary = useThemeVariable(NAV_THEME_VARIABLES.primary);
  const text = useThemeVariable(NAV_THEME_VARIABLES.text);

  return useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background,
        border,
        card,
        notification,
        primary,
        text
      }
    };
  }, [background, border, card, notification, primary, scheme, text]);
}
