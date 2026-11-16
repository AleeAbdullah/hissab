import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ChevronLeft } from 'lucide-react-native';

import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export default function SharedLayout() {
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
        options={{ title: 'Expense', headerLeft: () => backButton('expense') }}
      />
      <Stack.Screen
        name="expense/[expenseId]/edit"
        options={{ title: 'Edit expense' }}
      />
      <Stack.Screen
        name="payment/[paymentId]/index"
        options={{ title: 'Payment', headerLeft: () => backButton('payment') }}
      />
      <Stack.Screen
        name="payment/[paymentId]/edit"
        options={{ title: 'Edit payment' }}
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
      accessibilityLabel="Back"
      onPress={() =>
        router.canGoBack() ? router.back() : router.replace('/home')
      }
    >
      <Icon as={ChevronLeft} size={24} />
    </Button>
  );
}
