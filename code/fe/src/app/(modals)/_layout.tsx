import { Stack } from 'expo-router/stack';
import { Platform } from 'react-native';

export default function ModalLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerTitleAlign: 'center'
      }}
    >
      <Stack.Screen
        name="connection-new"
        options={{
          title: 'Add friend',
          // Fixed at presentation; iOS form sheets alone get a native toolbar.
          headerShown: Platform.OS === 'ios',
          presentation: 'formSheet',
          sheetGrabberVisible: true
        }}
      />
      <Stack.Screen name="shared-expense" options={{ title: 'Add expense' }} />
      <Stack.Screen name="receipt" options={{ title: 'Receipt' }} />
      <Stack.Screen name="report" options={{ title: 'Report' }} />
      <Stack.Screen
        name="settlement"
        options={{ title: 'Record settlement' }}
      />
    </Stack>
  );
}
