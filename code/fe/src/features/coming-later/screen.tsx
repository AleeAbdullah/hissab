import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { useAppTheme } from '@/theme/use-app-theme';

export function ComingLaterScreen({
  purpose,
  links = [],
}: {
  purpose: string;
  links?: { label: string; href: Href }[];
}) {
  const { colors } = useAppTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 12, paddingVertical: 48 }}>
        <Text selectable style={{ color: colors.text, fontSize: 28, lineHeight: 34, fontWeight: '700' }}>Coming later</Text>
        <Text selectable style={{ color: colors.secondary, fontSize: 17, lineHeight: 23 }}>{purpose}</Text>
      </View>
      {links.map((link) => <Button key={String(link.href)} title={link.label} href={link.href} secondary />)}
    </Screen>
  );
}
