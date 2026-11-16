import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { Stack } from 'expo-router/stack';
import { ChevronRight, X, type LucideIcon } from 'lucide-react-native';
import {
  useEffect,
  useContext,
  type ComponentProps,
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
import { surfaceVariants } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import { useLargeText } from '@/lib/text-scale';
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
      collapsable={false}
      style={{
        flex: 1,
        paddingBottom: Platform.OS === 'ios' ? keyboardHeight : 0
      }}
      behavior={Platform.OS === 'android' ? 'height' : undefined}
      keyboardVerticalOffset={Platform.OS === 'android' ? headerHeight : 0}
    >
      {content}
      <SafeAreaView
        edges={Platform.OS === 'ios' && keyboardHeight ? [] : ['bottom']}
        className="border-t border-border bg-background px-5 pb-3 pt-3"
      >
        {footer}
      </SafeAreaView>
    </KeyboardAvoidingView>
  ) : (
    content
  );
}

// Hero amounts scale to the 200% contract, not beyond, so they do not break between digits.
// shortcut: a value wider than about 10 characters can still wrap at 200%; fit it to width if such totals appear.
export function AmountText(props: ComponentProps<typeof Text>) {
  return <Text selectable maxFontSizeMultiplier={2} {...props} />;
}

export function Card({
  children,
  className
}: PropsWithChildren<{ className?: string }>) {
  // The inner -mb-px tucks the last row's divider under the card border instead of doubling it.
  return (
    <View className={surfaceVariants()}>
      <View className={cn('-mb-px', className)}>{children}</View>
    </View>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled,
  compact
}: {
  options: readonly {
    value: T;
    label: string;
    accessibilityLabel?: string;
    icon?: LucideIcon;
  }[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <View className="flex-row flex-wrap rounded-xl bg-muted p-1">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <RnrButton
            key={option.value}
            variant="ghost"
            size={compact ? 'compact' : 'default'}
            role="tab"
            disabled={disabled}
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected, disabled }}
            className={cn(
              'flex-1 rounded-lg px-2',
              option.icon ? 'min-w-12' : 'min-w-16',
              // In dark the card is darker than the track, so the selection uses the lighter border tone.
              selected && 'bg-card dark:bg-border'
            )}
            onPress={() => onChange(option.value)}
          >
            {option.icon ? (
              <Icon
                as={option.icon}
                size={18}
                className={selected ? 'text-primary' : 'text-muted-foreground'}
              />
            ) : (
              <Text
                className={selected ? 'text-primary' : 'text-muted-foreground'}
              >
                {option.label}
              </Text>
            )}
          </RnrButton>
        );
      })}
    </View>
  );
}

// Leading icon circle for list rows.
export function IconTile({ icon }: { icon: LucideIcon }) {
  return (
    <View className="size-10 items-center justify-center rounded-full bg-accent">
      <Icon as={icon} size={20} className="text-primary" />
    </View>
  );
}

// Day heading inside a dated list (Home, Records, Activity).
// Header for a single record: what it is, how much, and where and when.
export function DetailHero({
  icon,
  title,
  amount,
  meta,
  deleted,
  positive
}: {
  icon: LucideIcon;
  title: string;
  amount: string;
  meta: string;
  deleted?: boolean;
  positive?: boolean;
}) {
  return (
    <View className="items-center gap-1.5 py-2">
      <IconTile icon={icon} />
      <Text
        selectable
        className="text-center text-[17px] font-semibold leading-[23px]"
      >
        {title}
      </Text>
      <AmountText
        className={cn(
          'text-center text-[32px] font-semibold tabular-nums leading-[38px]',
          positive && 'text-positive',
          deleted && 'text-muted-foreground line-through'
        )}
      >
        {amount}
      </AmountText>
      <Text
        selectable
        className="text-center text-[15px] leading-[22px] text-muted-foreground"
      >
        {meta}
      </Text>
    </View>
  );
}

export function DayHeading({ children }: PropsWithChildren) {
  return (
    <Text
      selectable
      accessibilityRole="header"
      className="pt-2 text-[13px] font-semibold leading-[18px] text-muted-foreground"
    >
      {children}
    </Text>
  );
}

// Compact pill for quick choices and active filters.
export function Chip({
  label,
  selected = false,
  icon,
  trailingIcon,
  error,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  onPress
}: {
  label: string;
  selected?: boolean;
  icon?: LucideIcon;
  trailingIcon?: LucideIcon;
  error?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  onPress: () => void;
}) {
  const tint = selected ? 'text-primary' : 'text-foreground';
  return (
    <RnrButton
      variant="ghost"
      size="compact"
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected, disabled }}
      className={cn(
        'min-h-8 gap-1.5 rounded-full border border-border bg-card px-3',
        selected && 'border-primary bg-accent',
        error && 'border-destructive'
      )}
      onPress={onPress}
    >
      {icon ? <Icon as={icon} size={16} className={tint} /> : null}
      <Text className={cn('text-[15px] font-semibold leading-5', tint)}>
        {label}
      </Text>
      {trailingIcon ? (
        <Icon as={trailingIcon} size={16} className={tint} />
      ) : null}
    </RnrButton>
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
  const largeText = useLargeText();
  // At large text sizes the detail moves under the title so neither splits mid-word.
  const detailText = detail ? (
    <Text
      selectable
      className={cn(
        'text-[15px] leading-5 text-muted-foreground',
        !largeText && 'max-w-[42%] text-right',
        detailClassName
      )}
    >
      {detail}
    </Text>
  ) : null;
  const rowClassName = cn(
    'min-h-[52px] w-full flex-row items-center justify-start gap-3 rounded-none border-b border-border px-4 py-3',
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
              destructive && 'text-destructive',
              // Only the title dims, so the subtitle explaining why stays readable.
              disabled && 'opacity-[0.55]'
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
        {largeText ? detailText : null}
      </View>
      {largeText ? null : detailText}
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
        hero ? 'size-[88px]' : large ? 'size-14' : 'size-10'
      )}
    >
      <Text
        selectable
        // Initials are decorative (the circle carries the name label) and must fit a fixed circle.
        maxFontSizeMultiplier={1.3}
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

// Card-less list row: hairline divider inset past the leading tile; trailing drops under the text at large sizes.
export function ListRow({
  href,
  onPress,
  role,
  disabled,
  leading,
  title,
  subtitle,
  trailing,
  divided,
  accessibilityLabel,
  children
}: PropsWithChildren<{
  href?: Href;
  onPress?: () => void;
  role?: 'link' | 'button';
  disabled?: boolean;
  leading: ReactNode;
  title: string;
  subtitle?: string;
  trailing?: ReactNode;
  divided?: boolean;
  accessibilityLabel?: string;
}>) {
  const largeText = useLargeText();
  const body = (
    <>
      {leading}
      <View
        className={cn(
          'min-h-16 flex-1 flex-row items-center gap-3 py-3',
          divided && 'border-t border-border'
        )}
      >
        <View className="flex-1 gap-0.5">
          <Text
            selectable
            numberOfLines={2}
            className="text-base font-semibold leading-[22px]"
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              selectable
              className="text-[13px] font-normal leading-[18px] text-muted-foreground"
            >
              {subtitle}
            </Text>
          ) : null}
          {largeText && trailing ? (
            <View className="items-start">{trailing}</View>
          ) : null}
          {children}
        </View>
        {largeText ? null : trailing}
      </View>
    </>
  );
  if (!href && !onPress)
    return <View className="w-full flex-row items-center gap-3">{body}</View>;
  const control = (
    <RnrButton
      variant="ghost"
      role={role ?? (href ? 'link' : 'button')}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="h-auto w-full flex-row items-center justify-start gap-3 rounded-none px-0 py-0"
    >
      {body}
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
          surfaceVariants({ variant: 'control' }),
          'flex-row items-center pl-3',
          error && 'border-destructive'
        )}
      >
        <TextInput
          ref={inputRef}
          accessibilityLabel={label}
          secureTextEntry={isPassword && !passwordVisible}
          {...props}
          className={cn(
            'flex-1 self-stretch py-2.5 text-[17px] text-foreground placeholder:text-muted-foreground',
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

// Root of a form-sheet route. iOS shows the action in the native toolbar; Android gets
// an in-body title row because react-native-screens attaches no toolbar to its form sheets.
export function FormSheet({
  title,
  action,
  children
}: PropsWithChildren<{
  title: string;
  action: { label: string; onPress: () => void; disabled?: boolean };
}>) {
  // Same close control as the record editors, so every sheet closes the same way.
  const button = (
    <RnrButton
      variant="ghost"
      className="w-12 px-0"
      accessibilityLabel={action.label}
      disabled={action.disabled}
      onPress={action.onPress}
    >
      <Icon as={X} size={22} />
    </RnrButton>
  );
  return (
    // Without collapsable={false}, iOS form-sheet content disappeared when the detent
    // changed (keyboard or drag) on react-native-screens 4.26.
    <View collapsable={false} className="flex-1 bg-background">
      {Platform.OS === 'android' ? (
        <>
          <View
            accessible={false}
            className="mt-2 h-1 w-9 shrink-0 self-center rounded-full bg-muted-foreground"
          />
          <View className="flex-row flex-wrap items-center justify-between gap-2 px-5 pt-4">
            <Text
              accessibilityRole="header"
              className="shrink text-xl font-semibold"
            >
              {title}
            </Text>
            {button}
          </View>
        </>
      ) : (
        <Stack.Screen options={{ headerRight: () => button }} />
      )}
      {children}
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
