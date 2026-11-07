import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { ChevronRight } from 'lucide-react-native';
import {
  useEffect,
  useContext,
  useState,
  type PropsWithChildren,
  type ReactElement,
  type ReactNode,
  type Ref
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  type TextInputProps,
  type RefreshControlProps,
  View
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

import { Icons } from '@/components/icons';
import { Button as RnrButton } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export function Screen({
  children,
  refreshControl,
  footer,
  scrollRef
}: PropsWithChildren<{
  refreshControl?: ReactElement<RefreshControlProps>;
  footer?: ReactNode;
  scrollRef?: Ref<ScrollView>;
}>) {
  const insets = useSafeAreaInsets();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const [keyboardHeight, setKeyboardHeight] = useState(
    () => Keyboard.metrics()?.height ?? 0
  );

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const content = (
    <ScrollView
      ref={scrollRef}
      className="flex-1 bg-background"
      contentContainerClassName="flex-grow gap-4 p-5"
      contentContainerStyle={{
        paddingBottom: footer ? 20 : 20 + insets.bottom + keyboardHeight
      }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      refreshControl={refreshControl}
    >
      {children}
    </ScrollView>
  );
  return footer ? (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={headerHeight}
    >
      {content}
      <SafeAreaView
        edges={['bottom']}
        className="border-t border-border bg-background px-5 pb-3 pt-3"
      >
        {footer}
      </SafeAreaView>
    </KeyboardAvoidingView>
  ) : (
    content
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
  titleBadge,
  detail,
  detailClassName,
  subtitle,
  href,
  onPress,
  destructive,
  leading,
  trailing,
  disabled,
  className
}: {
  title: string;
  titleBadge?: string;
  detail?: string;
  detailClassName?: string;
  subtitle?: string;
  href?: Href;
  onPress?: () => void;
  destructive?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const rowClassName = cn(
    'min-h-[52px] w-full flex-row items-center justify-start gap-3 rounded-none border-b border-border p-3',
    disabled && 'opacity-[0.55]',
    className
  );
  const content = (
    <>
      {leading}
      <View className="flex-1 gap-0.5">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text
            selectable
            className={cn(
              'max-w-full text-[17px] leading-[23px]',
              destructive && 'text-destructive'
            )}
          >
            {title}
          </Text>
          {titleBadge ? (
            <Text className="rounded-md bg-muted px-2 py-1 text-xs leading-4 text-muted-foreground">
              {titleBadge}
            </Text>
          ) : null}
        </View>
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
          className={cn(
            'max-w-[42%] text-right text-[15px] leading-5 text-muted-foreground',
            detailClassName
          )}
        >
          {detail}
        </Text>
      ) : null}
      {trailing ??
        (href ? (
          <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
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

export function Avatar({
  name,
  large,
  hero
}: {
  name: string;
  large?: boolean;
  hero?: boolean;
}) {
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
        'items-center justify-center rounded-full bg-secondary',
        hero ? 'size-[88px]' : large ? 'size-14' : 'size-9'
      )}
    >
      <Text
        selectable
        className={cn(
          'font-bold text-foreground',
          hero ? 'text-[32px]' : large ? 'text-xl' : 'text-[13px]'
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
  trailing,
  inputRef,
  className,
  style,
  ...props
}: TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  trailing?: ReactNode;
  inputRef?: Ref<TextInput>;
}) {
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
          ref={inputRef}
          accessibilityLabel={label}
          secureTextEntry={isPassword && !passwordVisible}
          {...props}
          className={cn(
            'min-h-12 flex-1 py-2.5 text-[17px] text-foreground placeholder:text-muted-foreground',
            className
          )}
          style={style}
        />
        {trailing}
        {isPassword ? (
          <RnrButton
            className="w-12 px-0"
            variant="ghost"
            accessibilityLabel={
              passwordVisible ? 'Hide password' : 'Show password'
            }
            onPress={() => setPasswordVisible((value) => !value)}
          >
            <Icon
              as={passwordVisible ? Icons.eyeOff : Icons.eye}
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
