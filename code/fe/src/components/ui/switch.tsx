import { Switch, type SwitchProps } from 'react-native';

import { THEME_VARIABLES, useThemeVariable } from '@/lib/theme';

export function ThemedSwitch(props: SwitchProps) {
  const primary = useThemeVariable(THEME_VARIABLES.primaryText);
  const foreground = useThemeVariable(THEME_VARIABLES.primaryForeground);
  const input = useThemeVariable(THEME_VARIABLES.input);
  const border = useThemeVariable(THEME_VARIABLES.border);
  const card = useThemeVariable(THEME_VARIABLES.card);
  return (
    <Switch
      {...props}
      accessibilityRole="switch"
      accessibilityState={{
        ...props.accessibilityState,
        checked: Boolean(props.value),
        disabled: Boolean(props.disabled)
      }}
      trackColor={{
        false: props.disabled ? border : input,
        true: props.disabled ? border : primary
      }}
      thumbColor={props.disabled ? card : foreground}
      ios_backgroundColor={props.disabled ? border : input}
    />
  );
}
