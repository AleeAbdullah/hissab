import { Text, View } from 'react-native';

import { useAppTheme } from '@/theme/theme';

export function AuthPageHeader({ description, title }: { title: string; description?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={{ gap: 4, paddingTop: 4, paddingBottom: 4 }}>
      <Text selectable style={{ color: colors.text, fontSize: 32, lineHeight: 38, fontWeight: '700' }}>
        {title}
      </Text>
      {description ? (
        <Text selectable style={{ color: colors.secondary, fontSize: 15, lineHeight: 22 }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}
