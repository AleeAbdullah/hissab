import { useQuery } from '@tanstack/react-query';
import { Link, useLocalSearchParams } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { ChevronRight, Settings } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View, useWindowDimensions } from 'react-native';

import { Avatar, ErrorMessage, Loading, Screen } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { profileQuery } from '@/features/account/api';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { groupMembersQuery, groupQuery } from '@/features/groups/api';
import { LedgerActions } from '@/features/ledger/components/ledger-actions';
import { LedgerActivity } from '@/features/ledger/components/ledger-activity';
import { LedgerBalancePanel } from '@/features/ledger/components/ledger-balance-panel';

export default function GroupDetailScreen() {
  const { t } = useTranslation(['groups', 'common']);
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { fontScale } = useWindowDimensions();
  const group = useQuery(groupQuery(groupId));
  const balances = useQuery(ledgerBalancesQuery(groupId));
  const profile = useQuery(profileQuery);
  const members = useQuery(groupMembersQuery(groupId));
  if (
    group.isLoading ||
    profile.isLoading ||
    members.isLoading ||
    balances.isLoading
  )
    return <Loading />;
  if (
    group.error ||
    profile.error ||
    members.error ||
    balances.error ||
    !group.data ||
    !profile.data ||
    !members.data ||
    !balances.data
  )
    return (
      <Screen>
        <ErrorMessage
          error={
            group.error ??
            profile.error ??
            members.error ??
            balances.error ??
            new Error(t('groupUnavailable'))
          }
        />
        <Button
          variant="outline"
          onPress={() => {
            void group.refetch();
            void profile.refetch();
            void members.refetch();
            void balances.refetch();
          }}
        >
          <Text>{t('retry')}</Text>
        </Button>
      </Screen>
    );
  const canManage =
    group.data.status === 'ACTIVE' && group.data.membershipStatus === 'ACTIVE';
  const active = members.data.filter((member) => member.status === 'ACTIVE');
  const draft = {
    ledgerId: groupId,
    ledgerName: group.data.name,
    currentUserId: profile.data.id,
    displayCurrency: profile.data.displayCurrency,
    members: active.map((member) => ({
      userId: member.userId,
      displayName: member.displayName
    }))
  };
  return (
    <Screen
      footer={
        canManage ? (
          active.length < 2 ? (
            <Link
              href={{
                pathname: '/groups/[groupId]/invite',
                params: { groupId }
              }}
              asChild
            >
              <Button role="link">
                <Text>{t('inviteMembers')}</Text>
              </Button>
            </Link>
          ) : (
            <LedgerActions draft={draft} balances={balances.data} />
          )
        ) : undefined
      }
    >
      <Stack.Screen
        options={{
          title: group.data.name,
          headerTitle: () => <View />,
          headerBackVisible: true,
          headerRight: canManage
            ? () => (
                <Link
                  href={{
                    pathname: '/groups/[groupId]/settings',
                    params: { groupId }
                  }}
                  asChild
                >
                  <Button
                    className="w-12 px-0"
                    variant="ghost"
                    role="link"
                    accessibilityLabel={t('groupSettings')}
                  >
                    <Icon as={Settings} size={22} className="text-primary" />
                  </Button>
                </Link>
              )
            : undefined
        }}
      />
      <View
        className={
          fontScale >= 1.3
            ? 'items-start gap-3 py-2'
            : 'flex-row items-center gap-4 py-2'
        }
      >
        <Avatar name={group.data.name} large />
        <View
          className={fontScale >= 1.3 ? 'w-full gap-1' : 'min-w-0 flex-1 gap-1'}
        >
          <Text
            selectable
            accessibilityRole="header"
            className="text-[32px] font-semibold leading-[38px]"
          >
            {group.data.name}
          </Text>
          <Link
            href={{
              pathname: '/groups/[groupId]/members',
              params: { groupId }
            }}
            asChild
          >
            <Button
              variant="link"
              size="compact"
              role="link"
              className="justify-start self-start px-0"
            >
              <Text>
                {t(
                  group.data.status === 'ARCHIVED'
                    ? 'archivedMembers'
                    : group.data.membershipStatus === 'LEFT'
                      ? 'leftMembers'
                      : 'memberCount',
                  { count: active.length }
                )}
              </Text>
              <Icon as={ChevronRight} size={18} className="text-primary" />
            </Button>
          </Link>
        </View>
      </View>
      <LedgerBalancePanel
        balances={balances.data}
        draft={draft}
        canRecord={canManage && active.length >= 2}
      />
      {canManage && active.length === 1 ? (
        <View className="gap-2">
          <Text selectable className="text-muted-foreground">
            {t('sharedRecordsNeedAtLeastTwoActiveMembersInvitedPeople')}
          </Text>
        </View>
      ) : null}
      <LedgerActivity
        displayCurrency={profile.data.displayCurrency}
        ledgerId={groupId}
        ledgerName={group.data.name}
        members={members.data}
        currentUserId={profile.data.id}
      />
    </Screen>
  );
}
