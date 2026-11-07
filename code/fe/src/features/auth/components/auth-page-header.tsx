import { Link } from 'expo-router';
import { View } from 'react-native';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

export function AuthPageHeader({
  back,
  description,
  title
}: {
  title: string;
  description?: string;
  back?: boolean;
}) {
  return (
    <View className="gap-1 py-1">
      <View className="flex-row items-center gap-2">
        {back ? (
          <Link href="/welcome" dismissTo asChild>
            <Button
              className="w-12 px-0"
              variant="ghost"
              accessibilityLabel="Back"
              role="link"
            >
              <Icon
                as={Icons.arrowLeft}
                size={24}
                className="text-foreground"
              />
            </Button>
          </Link>
        ) : null}
        <Text
          selectable
          className="flex-1 text-[32px] font-bold leading-[38px]"
        >
          {title}
        </Text>
      </View>
      {description ? (
        <Text
          selectable
          className="text-[15px] leading-[22px] text-muted-foreground"
        >
          {description}
        </Text>
      ) : null}
    </View>
  );
}
