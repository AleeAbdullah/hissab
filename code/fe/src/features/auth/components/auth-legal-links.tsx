import { Trans, useTranslation } from 'react-i18next';
import { Linking, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function AuthLegalLinks({ agreement = false }: { agreement?: boolean }) {
  const { t } = useTranslation(['auth', 'common']);
  const terms = (
    <Button
      variant="link"
      size="compact"
      role="link"
      className="px-1"
      onPress={() =>
        void Linking.openURL('https://hissabapp.vercel.app/terms/')
      }
    >
      <Text className="text-[13px] leading-[18px] underline">{t('terms')}</Text>
    </Button>
  );
  const privacy = (
    <Button
      variant="link"
      size="compact"
      role="link"
      className="px-1"
      onPress={() =>
        void Linking.openURL('https://hissabapp.vercel.app/privacy/')
      }
    >
      <Text className="text-[13px] leading-[18px] underline">
        {t('privacy')}
      </Text>
    </Button>
  );
  return (
    <View className="flex-row flex-wrap items-center justify-center">
      {agreement ? (
        <Trans
          t={t}
          i18nKey="agreement"
          components={{
            terms,
            privacy,
            copy: (
              <Text className="text-[13px] leading-[18px] text-muted-foreground" />
            ),
            label: <Text className="text-[13px] leading-[18px] underline" />
          }}
        />
      ) : (
        <>
          {terms}
          <Text className="text-[13px] leading-[18px] text-muted-foreground">
            {t('legalSeparator')}
          </Text>
          {privacy}
        </>
      )}
    </View>
  );
}
