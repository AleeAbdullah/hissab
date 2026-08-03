import type { Href } from 'expo-router';
import { Link } from 'expo-router';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { useAppTheme } from '@/theme/use-app-theme';

export function Screen({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: colors.canvas }}
      contentContainerStyle={{ padding: 16, gap: 16, flexGrow: 1 }}
    >
      {children}
    </ScrollView>
  );
}

export function Card({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 16,
        borderCurve: 'continuous',
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(23,26,34,0.05)',
      }}
    >
      {children}
    </View>
  );
}

export function SectionLabel({ children }: PropsWithChildren) {
  const { colors } = useAppTheme();
  return (
    <Text
      selectable
      style={{ color: colors.secondary, fontSize: 13, lineHeight: 18, fontWeight: '600', letterSpacing: 0.6 }}
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
  disabled,
}: {
  title: string;
  detail?: string;
  subtitle?: string;
  href?: Href;
  onPress?: () => void;
  destructive?: boolean;
  leading?: ReactNode;
  disabled?: boolean;
}) {
  const { colors } = useAppTheme();
  const content = (
    <Pressable
      accessibilityRole={href ? 'link' : onPress ? 'button' : undefined}
      accessibilityState={{ disabled }}
      disabled={disabled || (!href && !onPress)}
      onPress={onPress}
      style={{
        minHeight: 52,
        padding: 12,
        gap: 12,
        flexDirection: 'row',
        alignItems: 'center',
        opacity: disabled ? 0.55 : 1,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
      }}
    >
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        <Text selectable style={{ color: destructive ? colors.negative : colors.text, fontSize: 17, lineHeight: 23 }}>
          {title}
        </Text>
        {subtitle ? <Text selectable style={{ color: colors.secondary, fontSize: 13, lineHeight: 18 }}>{subtitle}</Text> : null}
      </View>
      {detail ? <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 20, textAlign: 'right', maxWidth: '42%' }}>{detail}</Text> : null}
      {href ? <Text style={{ color: colors.secondary, fontSize: 22 }}>›</Text> : null}
    </Pressable>
  );
  return href ? <Link href={href} asChild>{content}</Link> : content;
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';
  const size = large ? 56 : 36;
  return (
    <View accessibilityLabel={`${name} avatar`} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#1F6F8B', alignItems: 'center', justifyContent: 'center' }}>
      <Text selectable style={{ color: '#FFFFFF', fontWeight: '700', fontSize: large ? 20 : 13 }}>{initials}</Text>
    </View>
  );
}

export function Field({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text selectable style={{ color: colors.secondary, fontSize: 13 }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.secondary}
        {...props}
        style={[
          {
            minHeight: 48,
            paddingHorizontal: 12,
            paddingVertical: 10,
            backgroundColor: colors.surface,
            color: colors.text,
            borderWidth: 1,
            borderColor: error ? colors.negative : colors.control,
            borderRadius: 12,
            borderCurve: 'continuous',
            fontSize: 17,
          },
          props.style,
        ]}
      />
      {error || hint ? <Text selectable style={{ color: error ? colors.negative : colors.secondary, fontSize: 13, lineHeight: 18 }}>{error ?? hint}</Text> : null}
    </View>
  );
}

export function Button({
  title,
  onPress,
  href,
  disabled,
  loading,
  secondary,
  destructive,
}: {
  title: string;
  onPress?: () => void;
  href?: Href;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
  destructive?: boolean;
}) {
  const { colors } = useAppTheme();
  const background = secondary ? colors.surface : destructive ? colors.negative : colors.brand;
  const foreground = secondary ? (destructive ? colors.negative : colors.brand) : colors.onBrand;
  const content = (
    <Pressable
      accessibilityRole={href ? 'link' : 'button'}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={{
        minHeight: 48,
        borderRadius: 12,
        borderCurve: 'continuous',
        borderWidth: secondary ? 1 : 0,
        borderColor: destructive ? colors.negative : colors.brand,
        backgroundColor: background,
        opacity: disabled ? 0.55 : 1,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {loading ? <ActivityIndicator color={foreground} /> : <Text style={{ color: foreground, fontSize: 17, fontWeight: '600' }}>{title}</Text>}
    </Pressable>
  );
  return href ? <Link href={href} asChild>{content}</Link> : content;
}

export function Notice({ title, children, error }: PropsWithChildren<{ title?: string; error?: boolean }>) {
  const { colors } = useAppTheme();
  return (
    <View style={{ backgroundColor: error ? colors.negativeSubtle : colors.warningSubtle, borderRadius: 12, borderCurve: 'continuous', padding: 12, gap: 4 }}>
      {title ? <Text selectable style={{ color: error ? colors.negative : colors.warning, fontSize: 15, fontWeight: '600' }}>{title}</Text> : null}
      <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

export function Loading() {
  const { colors } = useAppTheme();
  return <View style={{ flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={colors.brand} /></View>;
}

export function ErrorMessage({ error }: { error: unknown }) {
  return <Notice error>{error instanceof Error ? error.message : 'Something went wrong.'}</Notice>;
}
