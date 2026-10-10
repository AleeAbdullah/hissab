import { Stack } from 'expo-router/stack';
import { Platform } from 'react-native';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerShadowVisible: false
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Hissab',
          headerLargeTitle: Platform.OS === 'ios',
          headerTitleAlign: 'left',
          headerTitleStyle: {
            fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
            fontWeight: '400',
            fontSize: Platform.OS === 'ios' ? 20 : 24
          },
          headerLargeTitleStyle: {
            fontFamily: 'Georgia',
            fontWeight: '400',
            fontSize: 32
          }
        }}
      />
    </Stack>
  );
}
