import { Eye, EyeOff } from 'lucide-react-native';
import { useState, type PropsWithChildren } from 'react';
import { TextInput, type TextInputProps, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type AuthFieldProps = PropsWithChildren<{
  label: string;
  error?: string;
  hint?: string;
  first?: boolean;
}>;

export function AuthField({
  children,
  error,
  first,
  hint,
  label
}: AuthFieldProps) {
  return (
    <View
      className={cn(
        'gap-1 p-4',
        !first && 'border-t border-border',
        error && 'bg-destructive-muted'
      )}
    >
      <Text
        selectable
        className="text-xs font-semibold leading-4 tracking-[0.4px] text-muted-foreground"
      >
        {label}
      </Text>
      {children}
      {error || hint ? (
        <Text
          selectable
          className={cn(
            'text-xs leading-4',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}

export function AuthTextField({
  error,
  first,
  hint,
  label,
  secureTextEntry,
  className,
  style,
  ...props
}: TextInputProps & Omit<AuthFieldProps, 'children'>) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = secureTextEntry === true;
  return (
    <AuthField error={error} first={first} hint={hint} label={label}>
      <View className="min-h-11 flex-row items-center">
        <TextInput
          accessibilityLabel={label}
          secureTextEntry={isPassword && !passwordVisible}
          {...props}
          className={cn(
            'min-h-11 flex-1 py-0 text-base leading-6 text-foreground placeholder:text-muted-foreground',
            className
          )}
          style={style}
        />
        {isPassword ? (
          <PasswordVisibilityButton
            visible={passwordVisible}
            onPress={() => setPasswordVisible((value) => !value)}
          />
        ) : null}
      </View>
    </AuthField>
  );
}

function PasswordVisibilityButton({
  onPress,
  visible
}: {
  onPress: () => void;
  visible: boolean;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      accessibilityLabel={visible ? 'Hide password' : 'Show password'}
      onPress={onPress}
    >
      <Icon
        as={visible ? EyeOff : Eye}
        size={20}
        className="text-muted-foreground"
      />
    </Button>
  );
}
