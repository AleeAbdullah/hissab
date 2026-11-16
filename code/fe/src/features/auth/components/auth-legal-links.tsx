import { Linking, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

const legalLinks = [
  { label: 'Terms', url: 'https://hissabapp.vercel.app/terms/' },
  { label: 'Privacy Policy', url: 'https://hissabapp.vercel.app/privacy/' }
];

// Links stay buttons inside the sentence so each keeps the platform touch target.
export function AuthLegalLinks({ agreement = false }: { agreement?: boolean }) {
  const [terms, privacy] = legalLinks.map(({ label, url }) => (
    <Button
      key={label}
      variant="link"
      size="compact"
      role="link"
      className="px-1"
      onPress={() => void Linking.openURL(url)}
    >
      <Text className="text-[13px] leading-[18px] underline">{label}</Text>
    </Button>
  ));
  const muted = 'text-[13px] leading-[18px] text-muted-foreground';
  return (
    <View className="flex-row flex-wrap items-center justify-center">
      {agreement ? (
        <>
          <Text className={muted}>By signing up, you agree to our</Text>
          {terms}
          <Text className={muted}>and</Text>
          {privacy}
        </>
      ) : (
        <>
          {terms}
          <Text className={muted}>·</Text>
          {privacy}
        </>
      )}
    </View>
  );
}
