import { View } from 'react-native';

import { Text } from '@/components/ui/text';

export function AuthPageHeader({ description, title }: { title: string; description?: string }) {
  return (
    <View className="gap-1 py-1">
      <Text selectable className="text-[32px] font-bold leading-[38px]">{title}</Text>
      {description ? <Text selectable className="text-[15px] leading-[22px] text-muted-foreground">{description}</Text> : null}
    </View>
  );
}
