import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { queryClient } from '@/api/query-client';
import {
  Card,
  ErrorMessage,
  Field,
  Loading,
  Row,
  Screen,
  SectionLabel
} from '@/components/ui';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/dialog';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { ledgerBalancesQuery } from '@/features/balances/api';
import {
  archiveGroup,
  groupQuery,
  groupMembersQuery,
  groupsQuery,
  leaveGroup,
  updateGroup
} from '@/features/groups/api';
import { formatMinorAmount } from '@/lib/money';

export default function GroupSettingsScreen() {
  const dialog = useDialog();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const group = useQuery(groupQuery(groupId));
  const members = useQuery(groupMembersQuery(groupId));
  const balances = useQuery(ledgerBalancesQuery(groupId));
  const profile = useQuery(profileQuery);
  const locked = useRef(false);
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: groupsQuery.queryKey }),
      queryClient.invalidateQueries({ queryKey: ['home'] }),
      queryClient.invalidateQueries({ queryKey: ['activity'] }),
      queryClient.invalidateQueries({ queryKey: ['balances'] }),
      queryClient.invalidateQueries({
        queryKey: ledgerBalancesQuery(groupId).queryKey
      }),
      queryClient.invalidateQueries({ queryKey: ['group-invitations'] })
    ]);
  };
  const leave = useMutation({
    mutationFn: () => leaveGroup(groupId),
    onSuccess: async () => {
      await refresh();
      router.dismissTo('/groups');
    },
    onSettled: () => {
      locked.current = false;
    }
  });
  const archive = useMutation({
    mutationFn: () => archiveGroup(groupId),
    onSuccess: async () => {
      await refresh();
      router.dismissTo('/groups');
    },
    onSettled: () => {
      locked.current = false;
    }
  });
  const update = useMutation({
    mutationFn: (name: string) => updateGroup(groupId, name),
    onSuccess: refresh,
    onSettled: () => {
      locked.current = false;
    }
  });
  if (
    group.isLoading ||
    profile.isLoading ||
    balances.isLoading ||
    members.isLoading
  )
    return <Loading />;
  if (group.error || !group.data || profile.error || !profile.data)
    return (
      <Screen>
        <ErrorMessage
          error={
            group.error ?? profile.error ?? new Error('Group unavailable.')
          }
        />
      </Screen>
    );
  const canManage =
    group.data.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  const pending = leave.isPending || archive.isPending || update.isPending;
  const ownMember = balances.data?.members.find(
    (member) => member.userId === profile.data!.id
  );
  const own = ownMember ? BigInt(ownMember.netMinor) : undefined;
  const unsettled = balances.data?.members.filter(
    (member) => BigInt(member.netMinor) !== 0n
  ).length;
  const lastMember =
    members.isSuccess &&
    members.data.filter((member) => member.status === 'ACTIVE').length === 1;
  const leaveBlocked =
    !canManage ||
    !balances.isSuccess ||
    own === undefined ||
    own !== 0n ||
    !members.isSuccess;
  const archiveBlocked =
    !canManage ||
    !balances.isSuccess ||
    unsettled === undefined ||
    unsettled !== 0;
  const confirm = (action: 'leave' | 'archive') => {
    if (
      pending ||
      locked.current ||
      (action === 'leave' ? leaveBlocked : archiveBlocked)
    )
      return;
    dialog(
      action === 'leave' ? 'Leave group?' : 'Archive group?',
      action === 'leave'
        ? `Leave ${group.data.name}? Your financial history is retained.${lastMember ? ' You are the last active member, so leaving also archives the group.' : ''}`
        : `Archive ${group.data.name} for everyone? Its history remains readable.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action === 'leave' ? 'Leave group' : 'Archive group',
          style: 'destructive',
          onPress: () => {
            if (locked.current) return;
            locked.current = true;
            if (action === 'leave') leave.mutate();
            else archive.mutate();
          }
        }
      ]
    );
  };
  return (
    <Screen>
      <Stack.Screen options={{ title: 'Group settings' }} />
      {!canManage ? (
        <Text selectable className="text-muted-foreground">
          Only active members can manage an active group.
        </Text>
      ) : null}
      {update.error ||
      leave.error ||
      archive.error ||
      balances.error ||
      members.error ? (
        <ErrorMessage
          error={
            update.error ??
            leave.error ??
            archive.error ??
            balances.error ??
            members.error
          }
        />
      ) : null}
      <GroupNameForm
        initialName={group.data.name}
        canManage={canManage}
        disabled={pending}
        saving={update.isPending}
        onSave={(name) => {
          if (!canManage || pending || locked.current) return;
          locked.current = true;
          update.mutate(name);
        }}
      />
      <Card>
        <Row
          title="Balance details"
          href={{ pathname: '/groups/[groupId]/balances', params: { groupId } }}
        />
        <Row
          title="Report group"
          href={{
            pathname: '/report',
            params: {
              targetType: 'GROUP',
              targetId: groupId,
              name: group.data.name
            }
          }}
        />
      </Card>
      <SectionLabel>MEMBERSHIP</SectionLabel>
      <Card>
        <Row
          title="Leave group"
          destructive
          disabled={pending || leaveBlocked}
          detail={leave.isPending ? 'Leaving…' : undefined}
          subtitle={
            own === undefined
              ? 'Balance eligibility is unavailable.'
              : own === 0n
                ? lastMember
                  ? 'You are the last member, so this also archives the group.'
                  : 'Your balance is settled.'
                : `Settle your balance first. ${own < 0n ? 'You owe' : "You're owed"} ${formatMinorAmount((own < 0n ? -own : own).toString(), profile.data.displayCurrency)}.`
          }
          onPress={() => confirm('leave')}
        />
        <Row
          title="Archive group"
          destructive
          disabled={pending || archiveBlocked}
          detail={archive.isPending ? 'Archiving…' : undefined}
          subtitle={
            unsettled === undefined
              ? 'Balance eligibility is unavailable.'
              : unsettled
                ? `Everyone must be settled first. ${unsettled} ${unsettled === 1 ? 'member has' : 'members have'} open balances.`
                : 'Everyone is settled. Archives the group for all members.'
          }
          onPress={() => confirm('archive')}
        />
      </Card>
      {balances.error || members.error ? (
        <Button
          variant="outline"
          onPress={() => {
            void balances.refetch();
            void members.refetch();
          }}
        >
          <Text>Retry eligibility check</Text>
        </Button>
      ) : null}
    </Screen>
  );
}

function GroupNameForm({
  initialName,
  canManage,
  disabled,
  saving,
  onSave
}: {
  initialName: string;
  canManage: boolean;
  disabled: boolean;
  saving: boolean;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(initialName);
  const valid =
    canManage &&
    !disabled &&
    Boolean(name.trim()) &&
    name.trim() !== initialName &&
    name.trim().length <= 100;
  const save = () => {
    if (valid) onSave(name.trim());
  };
  return (
    <View className="gap-3">
      <Field
        label="Group name"
        value={name}
        onChangeText={setName}
        onSubmitEditing={save}
        maxLength={100}
        editable={canManage && !disabled}
        hint="Up to 100 characters"
      />
      <Button
        disabled={!valid}
        accessibilityState={{ disabled: !valid, busy: saving }}
        onPress={save}
      >
        <Text>{saving ? 'Saving…' : 'Save name'}</Text>
      </Button>
    </View>
  );
}
