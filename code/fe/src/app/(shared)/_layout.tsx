import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { i18n } from '@/i18n';

export default function SharedLayout() {
  const { t } = useTranslation(['common', 'settlements']);
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="expense/[expenseId]/index"
        options={{ title: t('expense'), headerLeft: () => backButton('expense') }}
      />
      <Stack.Screen
        name="expense/[expenseId]/edit"
        options={{ title: t('editExpense') }}
      />
      <Stack.Screen
        name="payment/[paymentId]/index"
        options={{
          title: t('settlements:payment'),
          headerLeft: () => backButton('payment')
        }}
      />
      <Stack.Screen
        name="payment/[paymentId]/edit"
        options={{ title: t('settlements:editPayment') }}
      />
    </Stack>
  );
}

function backButton(key: string) {
  return (
    <Button
      key={key}
      variant="ghost"
      className="w-12 px-0"
      accessibilityLabel={i18n.t('common:back')}
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace('/home')
      }
    >
      <Icon as={ChevronLeft} size={24} />
    </Button>
  );
}
