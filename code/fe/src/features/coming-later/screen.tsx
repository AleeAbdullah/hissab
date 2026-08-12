import { Link, type Href } from 'expo-router';
import { View } from 'react-native';

import { Card, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function ComingLaterScreen({
  actionLabel,
  eyebrow,
  note,
  purpose,
  links = [],
  title = 'Coming later'
}: {
  actionLabel?: string;
  eyebrow?: string;
  note?: string;
  purpose: string;
  links?: { label: string; href: Href }[];
  title?: string;
}) {
  return (
    <Screen>
      <View className="flex-1 justify-center gap-4 py-12">
        {eyebrow ? (
          <Text
            selectable
            className="text-xs font-bold leading-4 tracking-[1px] text-primary"
          >
            {eyebrow}
          </Text>
        ) : null}
        <View className="gap-2">
          <Text selectable className="text-[32px] font-bold leading-[38px]">
            {title}
          </Text>
          <Text selectable className="leading-6 text-muted-foreground">
            {purpose}
          </Text>
        </View>
        {note ? (
          <Card>
            <View className="gap-1 p-4">
              <Text
                selectable
                className="text-xs font-semibold leading-4 tracking-[0.4px] text-muted-foreground"
              >
                BACKEND STATUS
              </Text>
              <Text selectable className="text-[15px] leading-[22px]">
                {note}
              </Text>
            </View>
          </Card>
        ) : null}
        {actionLabel ? (
          <Button disabled>
            <Text>{actionLabel}</Text>
          </Button>
        ) : null}
      </View>
      {links.map((link) => (
        <Link key={String(link.href)} href={link.href} asChild>
          <Button variant="outline" role="link">
            <Text>{link.label}</Text>
          </Button>
        </Link>
      ))}
    </Screen>
  );
}
