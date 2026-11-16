import { View } from 'react-native';

import { Icons } from '@/components/icons';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export const MIN_PASSWORD_LENGTH = 12;

// Live password rule: the icon and wording change with the colour, so state never relies on colour alone.
export function PasswordRequirement({ password }: { password: string }) {
  const met = password.length >= MIN_PASSWORD_LENGTH;
  return (
    <View
      accessible
      accessibilityLabel={`Password needs at least ${MIN_PASSWORD_LENGTH} characters. ${met ? 'Met.' : `${password.length} so far.`}`}
      className="gap-2 rounded-xl bg-muted p-4"
    >
      <Text className="text-[15px] font-semibold leading-[22px]">
        Your password needs
      </Text>
      <View className="flex-row items-center gap-2">
        <Icon
          as={met ? Icons.check : Icons.circle}
          size={18}
          className={met ? 'text-positive' : 'text-muted-foreground'}
        />
        <Text
          className={cn(
            'flex-1 text-[15px] leading-[22px]',
            met ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          At least {MIN_PASSWORD_LENGTH} characters
          {met ? '' : ` (${password.length}/${MIN_PASSWORD_LENGTH})`}
        </Text>
      </View>
    </View>
  );
}
