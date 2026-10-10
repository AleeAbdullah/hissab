import { router } from 'expo-router';
import { CreateGroupForm } from '@/features/groups/components/create-group-form';

export default function NewGroupScreen() {
  return (
    <CreateGroupForm
      onCancel={() => router.back()}
      onCreated={(group) =>
        router.dismissTo({
          pathname: '/groups/[groupId]',
          params: { groupId: group.id }
        })
      }
    />
  );
}
