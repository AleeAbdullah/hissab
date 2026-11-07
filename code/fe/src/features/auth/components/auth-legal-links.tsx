import { Linking, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

export function AuthLegalLinks({ agreement = false }: { agreement?: boolean }) {
  return (
    <View className="items-center">
      {agreement ? (
        <Text
          selectable
          className="text-center text-xs leading-4 text-muted-foreground"
        >
          By creating an account you agree to the
        </Text>
      ) : null}
      <View className="flex-row flex-wrap items-center justify-center">
        <Button
          variant="link"
          size="compact"
          role="link"
          onPress={() =>
            void Linking.openURL('https://hissabapp.vercel.app/terms/')
          }
        >
          <Text className="text-xs leading-4 underline">
            {agreement ? 'Terms' : 'Terms and conditions'}
          </Text>
        </Button>
        <Text selectable className="text-xs leading-4 text-muted-foreground">
          {agreement ? 'and' : '·'}
        </Text>
        <Button
          variant="link"
          size="compact"
          role="link"
          onPress={() =>
            void Linking.openURL('https://hissabapp.vercel.app/privacy/')
          }
        >
          <Text className="text-xs leading-4 underline">Privacy Policy</Text>
        </Button>
      </View>
    </View>
  );
}
