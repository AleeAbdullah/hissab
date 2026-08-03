import type { PropsWithChildren } from 'react';
import { Text, TextInput, type TextInputProps, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

type AuthFieldProps = PropsWithChildren<{
  label: string;
  error?: string;
  hint?: string;
  first?: boolean;
}>;

export function AuthField({ children, error, first, hint, label }: AuthFieldProps) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        gap: 4,
        padding: 16,
        backgroundColor: error ? colors.negativeSubtle : undefined,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: colors.divider,
      }}
    >
      <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 }}>
        {label}
      </Text>
      {children}
      {error || hint ? (
        <Text selectable style={{ color: error ? colors.negative : colors.secondary, fontSize: 12, lineHeight: 16 }}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}

export function AuthTextField({ error, first, hint, label, style, ...props }: TextInputProps & Omit<AuthFieldProps, 'children'>) {
  const { colors } = useAppTheme();
  return (
    <AuthField error={error} first={first} hint={hint} label={label}>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.secondary}
        {...props}
        style={[
          {
            minHeight: 44,
            paddingVertical: 0,
            color: colors.text,
            fontSize: 16,
            lineHeight: 24,
          },
          style,
        ]}
      />
    </AuthField>
  );
}
