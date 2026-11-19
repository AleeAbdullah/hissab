import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { isolate } from '@/i18n';
import { formatMinorAmount } from '@/lib/money';

export default function GroupSettingsScreen() {
  const { t } = useTranslation(['groups', 'common']);
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
            group.error ?? profile.error ?? new Error(t('groupUnavailable'))
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
      action === 'leave' ? t('leaveGroup') : t('archiveGroup'),
      action === 'leave'
        ? lastMember
          ? t('leaveYourFinancialHistoryIsRetainedYouAreTheLast', {
              group: isolate(group.data.name)
            })
          : t('leaveYourFinancialHistoryIsRetained', {
              group: isolate(group.data.name)
            })
        : t('archiveForEveryoneItsHistoryRemainsReadable', {
            group: isolate(group.data.name)
          }),
      [
        { text: t('common:cancel'), style: 'cancel' },
        {
          text: action === 'leave' ? t('leaveGroup2') : t('archiveGroup2'),
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
      <Stack.Screen options={{ title: t('groupSettings') }} />
      {!canManage ? (
        <Text selectable className="text-muted-foreground">
          {t('onlyActiveMembersCanManageAnActiveGroup')}
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
          title={t('balanceDetails')}
          href={{ pathname: '/groups/[groupId]/balances', params: { groupId } }}
        />
        <Row
          title={t('reportGroup')}
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
      <SectionLabel>{t('membership')}</SectionLabel>
      <Card>
        <Row
          title={t('leaveGroup2')}
          destructive
          disabled={pending || leaveBlocked}
          detail={leave.isPending ? t('leaving') : undefined}
          subtitle={
            own === undefined
              ? t('balanceEligibilityIsUnavailable')
              : own === 0n
                ? lastMember
                  ? t('youAreTheLastMemberSoThisAlsoArchivesThe')
                  : t('yourBalanceIsSettled')
                : t(own < 0n ? 'settleOwe' : 'settleOwed', {
                    amount: isolate(
                      formatMinorAmount(
                        (own < 0n ? -own : own).toString(),
                        profile.data.displayCurrency
                      )
                    )
                  })
          }
          onPress={() => confirm('leave')}
        />
        <Row
          title={t('archiveGroup2')}
          destructive
          disabled={pending || archiveBlocked}
          detail={archive.isPending ? t('archiving') : undefined}
          subtitle={
            unsettled === undefined
              ? t('balanceEligibilityIsUnavailable')
              : unsettled
                ? t('unsettledMembers', { count: unsettled })
                : t('everyoneIsSettledArchivesTheGroupForAllMembers')
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
          <Text>{t('retryEligibilityCheck')}</Text>
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
  const { t } = useTranslation(['groups', 'common']);
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
        label={t('groupName')}
        value={name}
        onChangeText={setName}
        onSubmitEditing={save}
        maxLength={100}
        editable={canManage && !disabled}
        hint={t('upTo100Characters')}
      />
      <Button
        disabled={!valid}
        accessibilityState={{ disabled: !valid, busy: saving }}
        onPress={save}
      >
        <Text>{saving ? t('saving') : t('saveName')}</Text>
      </Button>
    </View>
  );
}
