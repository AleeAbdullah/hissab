import { UsersRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import type { DeletionPlan, DisplayCurrency } from '@/api/contracts';
import { Avatar, IconTile, ListRow, Notice, SectionLabel } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { isolate } from '@/i18n';
import { amountToneClass, formatMinorAmount } from '@/lib/money';
import { cn } from '@/lib/utils';

// Lists exactly what deletion will record and which groups it will leave.
export function DeletionReview({
  plan,
  viewerId,
  displayCurrency
}: {
  plan: DeletionPlan;
  viewerId: string;
  displayCurrency: DisplayCurrency;
}) {
  const { t } = useTranslation('account');
  const hasBalances = plan.settlements.length > 0;
  const hasGroups = plan.groups.length > 0;

  return (
    <>
      <View className="gap-1">
        <Text
          selectable
          accessibilityRole="header"
          className="text-xl font-bold leading-[26px]"
        >
          {t('deletionReviewTitle')}
        </Text>
        <Text
          selectable
          className="text-[15px] leading-[22px] text-muted-foreground"
        >
          {hasBalances && hasGroups
            ? t('deletionReviewBoth')
            : hasBalances
              ? t('deletionReviewBalances')
              : t('deletionReviewGroups')}
        </Text>
      </View>
      {hasBalances ? (
        <View>
          <SectionLabel>{t('balancesToSettle')}</SectionLabel>
          {plan.settlements.map((settlement, index) => {
            const youPay = settlement.fromUserId === viewerId;
            const name = isolate(
              youPay ? settlement.toDisplayName : settlement.fromDisplayName
            );
            const group = settlement.groupName
              ? isolate(settlement.groupName)
              : null;
            const signed = youPay
              ? `-${settlement.amountMinor}`
              : settlement.amountMinor;
            return (
              <ListRow
                key={`${settlement.ledgerId}:${settlement.fromUserId}:${settlement.toUserId}`}
                divided={index > 0}
                leading={
                  <Avatar
                    name={
                      youPay
                        ? settlement.toDisplayName
                        : settlement.fromDisplayName
                    }
                  />
                }
                title={
                  youPay
                    ? settlement.toDisplayName
                    : settlement.fromDisplayName
                }
                subtitle={
                  group
                    ? t(youPay ? 'recordedYouPaidInGroup' : 'recordedTheyPaidInGroup', {
                        name,
                        group
                      })
                    : t(youPay ? 'recordedYouPaid' : 'recordedTheyPaid', {
                        name
                      })
                }
                trailing={
                  <View className="items-end">
                    <Text
                      selectable
                      className={cn(
                        'text-base font-semibold tabular-nums leading-[22px]',
                        amountToneClass(signed)
                      )}
                    >
                      {formatMinorAmount(signed, displayCurrency)}
                    </Text>
                    <Text
                      selectable
                      className="text-xs leading-4 text-muted-foreground"
                    >
                      {youPay ? t('youPayLabel') : t('youReceiveLabel')}
                    </Text>
                  </View>
                }
              />
            );
          })}
        </View>
      ) : null}
      {hasGroups ? (
        <View>
          <SectionLabel>{t('groupsToLeave')}</SectionLabel>
          {plan.groups.map((group, index) => (
            <ListRow
              key={group.groupId}
              divided={index > 0}
              leading={<IconTile icon={UsersRound} />}
              title={group.name}
              subtitle={
                group.willArchive ? t('groupWillArchive') : t('groupYouLeave')
              }
            />
          ))}
        </View>
      ) : null}
      <Notice>
        {hasBalances ? t('settlingOnlyRecords') : t('leavingGroupsNote')}
      </Notice>
    </>
  );
}
