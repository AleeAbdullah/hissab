import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { View } from 'react-native';

import { Notice, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { GroupInviteForm } from '@/features/groups/components/group-invite-form';

export default function GroupInviteScreen() {
  const { groupId } = useLocalSearchParams<{ groupId?: string }>();
  return (
    <View className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />
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
