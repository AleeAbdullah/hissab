import { useState, type PropsWithChildren } from 'react';
import { Pressable, Text, TextInput, type TextInputProps, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

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

export function AuthTextField({ error, first, hint, label, secureTextEntry, style, ...props }: TextInputProps & Omit<AuthFieldProps, 'children'>) {
  const { colors } = useAppTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = secureTextEntry === true;
  return (
    <AuthField error={error} first={first} hint={hint} label={label}>
      <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center' }}>
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={colors.secondary}
          secureTextEntry={isPassword && !passwordVisible}
          {...props}
          style={[
            {
              flex: 1,
              minHeight: 44,
              paddingVertical: 0,
              color: colors.text,
              fontSize: 16,
              lineHeight: 24,
            },
            style,
          ]}
        />
        {isPassword ? <PasswordVisibilityButton visible={passwordVisible} onPress={() => setPasswordVisible((value) => !value)} /> : null}
      </View>
    </AuthField>
  );
}

function PasswordVisibilityButton({ onPress, visible }: { onPress: () => void; visible: boolean }) {
  const { colors } = useAppTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={visible ? 'Hide password' : 'Show password'} onPress={onPress} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
      <SymbolView name={{ ios: visible ? 'eye.slash' : 'eye', android: visible ? 'visibility_off' : 'visibility', web: visible ? 'visibility_off' : 'visibility' }} size={20} tintColor={colors.secondary} />
    </Pressable>
  );
}
