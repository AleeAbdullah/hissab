import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Platform, View, useWindowDimensions } from 'react-native';

import { Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { GroupInviteForm } from '@/features/groups/components/group-invite-form';

export default function GroupInviteScreen() {
  const { fontScale } = useWindowDimensions();
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen
        options={{
          headerShown: false,
          sheetInitialDetentIndex: fontScale >= 1.3 ? 1 : 0
        }}
      />
      {Platform.OS === 'android' ? (
        <View
          accessible={false}
          className="mt-2 h-1 w-9 shrink-0 self-center rounded-full bg-muted-foreground"
        />
      ) : null}
      <View className="flex-row flex-wrap items-center justify-between gap-2 px-5 pt-4">
        <Text
          accessibilityRole="header"
          className="shrink text-xl font-semibold"
        >
          Invite members
        </Text>
        <Button variant="ghost" onPress={() => router.back()}>
          <Text>Done</Text>
        </Button>
      </View>
      {groupId ? (
        <GroupInviteForm groupId={groupId} />
      ) : (
        <Screen>
          <Notice title="Group unavailable">
            Open invitations from a group.
          </Notice>
        </Screen>
      )}
    </View>
  );
}
