import type { Href } from 'expo-router';
import { Text, View } from 'react-native';

import { Button, Card, Screen } from '@/components/ui';
import { useAppTheme } from '@/theme/theme';

export function ComingLaterScreen({
  actionLabel,
  eyebrow,
  note,
  purpose,
  links = [],
  title = 'Coming later',
}: {
  actionLabel?: string;
  eyebrow?: string;
  note?: string;
  purpose: string;
  links?: { label: string; href: Href }[];
  title?: string;
}) {
  const { colors } = useAppTheme();
  return (
    <Screen>
      <View style={{ flex: 1, justifyContent: 'center', gap: 16, paddingVertical: 48 }}>
        {eyebrow ? <Text selectable style={{ color: colors.brand, fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 1 }}>{eyebrow}</Text> : null}
        <View style={{ gap: 8 }}>
          <Text selectable style={{ color: colors.text, fontSize: 32, lineHeight: 38, fontWeight: '700' }}>{title}</Text>
          <Text selectable style={{ color: colors.secondary, fontSize: 16, lineHeight: 24 }}>{purpose}</Text>
        </View>
        {note ? (
          <Card>
            <View style={{ gap: 4, padding: 16 }}>
              <Text selectable style={{ color: colors.secondary, fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 }}>BACKEND STATUS</Text>
              <Text selectable style={{ color: colors.text, fontSize: 15, lineHeight: 22 }}>{note}</Text>
            </View>
          </Card>
        ) : null}
        {actionLabel ? <Button title={actionLabel} disabled /> : null}
      </View>
      {links.map((link) => <Button key={String(link.href)} title={link.label} href={link.href} secondary />)}
    </Screen>
  );
}
