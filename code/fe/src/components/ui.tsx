import { Eye, EyeOff } from 'lucide-react-native';
import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import {
  useState,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode
} from 'react';
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  type TextInputProps,
  type RefreshControlProps,
  View
} from 'react-native';

import { Button as RnrButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function Screen({
  children,
  refreshControl
}: PropsWithChildren<{ refreshControl?: ReactElement<RefreshControlProps> }>) {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow gap-4 p-5"
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children }: PropsWithChildren) {
  return (
    <View className="overflow-hidden rounded-2xl border border-border bg-card">
      {children}
    </View>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  return (
    <Text
      selectable
      className="text-[13px] font-semibold leading-[18px] tracking-[0.6px] text-muted-foreground"
    >
      {children}
    </Text>
  );
}

export function Row({
  title,
  detail,
  subtitle,
  href,
  onPress,
  destructive,
  leading,
  trailing,
  disabled
}: {
  title: string;
  detail?: string;
  subtitle?: string;
  href?: Href;
  onPress?: () => void;
  destructive?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
}) {
  const rowClassName = cn(
    'min-h-[52px] w-full flex-row items-center justify-start gap-3 rounded-none border-b border-border p-3',
    disabled && 'opacity-[0.55]'
  );
  const content = (
    <>
      {leading}
      <View className="flex-1 gap-0.5">
        <Text
          selectable
          className={cn(
            'text-[17px] leading-[23px]',
            destructive && 'text-destructive'
          )}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            selectable
            className="text-[13px] leading-[18px] text-muted-foreground"
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {detail ? (
        <Text
          selectable
          className="max-w-[42%] text-right text-[15px] leading-5 text-muted-foreground"
        >
          {detail}
        </Text>
      ) : null}
      {trailing ??
        (href ? (
          <Text className="text-[22px] text-muted-foreground">›</Text>
        ) : null)}
    </>
  );
  if (!href && !onPress) return <View className={rowClassName}>{content}</View>;
  const control = (
    <RnrButton
      variant="ghost"
      role={href ? 'link' : 'button'}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={rowClassName}
    >
      {content}
    </RnrButton>
  );
  return href ? (
    <Link href={href} asChild>
      {control}
    </Link>
  ) : (
    control
  );
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || '?';
  return (
    <View
      accessibilityLabel={`${name} avatar`}
      className={cn(
        'items-center justify-center rounded-full bg-primary',
        large ? 'size-14' : 'size-9'
      )}
    >
      <Text
        selectable
        className={cn(
          'font-bold text-primary-foreground',
          large ? 'text-xl' : 'text-[13px]'
        )}
      >
        {initials}
      </Text>
    </View>
  );
}

export function Field({
  label,
  error,
  hint,
  secureTextEntry,
  className,
  style,
  ...props
}: TextInputProps & { label: string; error?: string; hint?: string }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const isPassword = secureTextEntry === true;
  return (
    <View className="gap-1.5">
      <Text selectable className="text-[13px] text-muted-foreground">
        {label}
      </Text>
      <View
        className={cn(
          'min-h-12 flex-row items-center rounded-xl border bg-card pl-3',
          error ? 'border-destructive' : 'border-input'
        )}
      >
        <TextInput
          accessibilityLabel={label}
          secureTextEntry={isPassword && !passwordVisible}
          {...props}
          className={cn(
            'min-h-12 flex-1 py-2.5 text-[17px] text-foreground placeholder:text-muted-foreground',
            className
          )}
          style={style}
        />
        {isPassword ? (
          <RnrButton
            variant="ghost"
            size="icon"
            accessibilityLabel={
              passwordVisible ? 'Hide password' : 'Show password'
            }
            onPress={() => setPasswordVisible((value) => !value)}
          >
            <Icon
              as={passwordVisible ? EyeOff : Eye}
              size={20}
              className="text-muted-foreground"
            />
          </RnrButton>
        ) : null}
      </View>
      {error || hint ? (
        <Text
          selectable
          className={cn(
            'text-[13px] leading-[18px]',
            error ? 'text-destructive' : 'text-muted-foreground'
          )}
        >
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Notice({
  title,
  children,
  error
}: PropsWithChildren<{ title?: string; error?: boolean }>) {
  return (
    <View
      className={cn(
        'gap-1 rounded-xl p-3',
        error ? 'bg-destructive-muted' : 'bg-warning-muted'
      )}
    >
      {title ? (
        <Text
          selectable
          className={cn(
            'text-[15px] font-semibold',
            error ? 'text-destructive' : 'text-warning'
          )}
        >
          {title}
        </Text>
      ) : null}
      <Text selectable className="text-[15px] leading-5 text-foreground">
        {children}
      </Text>
    </View>
  );
}

export function Loading() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator className="text-primary" />
    </View>
  );
}

export function ErrorMessage({ error }: { error: unknown }) {
  return (
    <Notice error>
      {error instanceof Error ? error.message : 'Something went wrong.'}
    </Notice>
  );
}
