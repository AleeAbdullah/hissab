import { Stack } from 'expo-router/stack';

export default function SharedLayout() {
  return <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}><Stack.Screen name="expense/[expenseId]/index" options={{ title: 'Expense' }} /><Stack.Screen name="expense/[expenseId]/edit" options={{ title: 'Edit expense' }} /><Stack.Screen name="payment/[paymentId]/index" options={{ title: 'Payment' }} /><Stack.Screen name="payment/[paymentId]/edit" options={{ title: 'Edit payment' }} /></Stack>;
}
