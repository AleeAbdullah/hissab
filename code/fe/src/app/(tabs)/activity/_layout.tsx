import { Stack } from 'expo-router/stack';
import { useAppTheme } from '@/theme/use-app-theme';
export default function ActivityLayout() { const { colors } = useAppTheme(); return <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false, contentStyle: { backgroundColor: colors.canvas } }}><Stack.Screen name="index" options={{ title: 'Activity', headerLargeTitle: true }} /><Stack.Screen name="search" options={{ title: 'Search activity' }} /></Stack>; }
