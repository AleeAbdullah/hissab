import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { Icons } from '@/components/icons';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export const MIN_PASSWORD_LENGTH = 12;

// Live password rule: the icon and wording change with the colour, so state never relies on colour alone.
export function PasswordRequirement({ password }: { password: string }) {
  const { t } = useTranslation(['auth', 'common']);
  const met = password.length >= MIN_PASSWORD_LENGTH;
  return (
    <View
      accessible
      accessibilityLabel={t(met ? 'passwordMet' : 'passwordProgress', {
        minimum: MIN_PASSWORD_LENGTH,
        length: password.length
      })}
      className="gap-2 rounded-xl bg-muted p-4"
    >
      <Text className="text-[15px] font-semibold leading-[22px]">
        {t('yourPasswordNeeds')}
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
          {t(met ? 'passwordMinimum' : 'passwordMinimumProgress', {
            minimum: MIN_PASSWORD_LENGTH,
            length: password.length
          })}
        </Text>
      </View>
    </View>
  );
}
