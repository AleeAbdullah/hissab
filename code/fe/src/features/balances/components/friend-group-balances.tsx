import { useQueries, useQuery } from '@tanstack/react-query';
import { UsersRound } from 'lucide-react-native';
import { View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { IconTile, ListRow, SectionLabel } from '@/components/ui';
import { Text } from '@/components/ui/text';
import { ledgerBalancesQuery } from '@/features/balances/api';
import { simplifyLedgerBalances } from '@/features/balances/simplify';
import { groupsQuery } from '@/features/groups/api';
import { formatMinorAmount } from '@/lib/money';

// A friend page only shows the direct ledger, so list the suggested payments
// between the two of you in each active group you share.
export function FriendGroupBalances({
  friendId,
  friendName,
  viewerId,
  displayCurrency
}: {
  friendId: string;
  friendName: string;
  viewerId: string;
  displayCurrency: DisplayCurrency;
}) {
  const groups = useQuery(groupsQuery);
  const active = (groups.data ?? []).filter(
    (group) => group.status === 'ACTIVE' && group.membershipStatus === 'ACTIVE'
  );
  const balances = useQueries({
    queries: active.map((group) => ledgerBalancesQuery(group.id))
  });
  const rows = active.flatMap((group, index) => {
    const members = balances[index]?.data?.members;
    if (!members?.some((member) => member.userId === friendId)) return [];
    const payment = simplifyLedgerBalances(members)?.find(
      (item) =>
        (item.fromUserId === viewerId && item.toUserId === friendId) ||
        (item.fromUserId === friendId && item.toUserId === viewerId)
    );
    return payment ? [{ group, payment }] : [];
  });
  if (!rows.length) return null;
  return (
    <View>
      <SectionLabel>IN SHARED GROUPS</SectionLabel>
      {rows.map(({ group, payment }, index) => (
        <ListRow
          key={group.id}
          divided={index > 0}
          href={{
            pathname: '/groups/[groupId]',
            params: { groupId: group.id }
          }}
          leading={<IconTile icon={UsersRound} />}
          title={group.name}
          subtitle={
            payment.fromUserId === viewerId
              ? `You pay ${friendName}`
              : `${friendName} pays you`
          }
          trailing={
            <Text
              selectable
              className="text-base font-semibold tabular-nums leading-[22px]"
            >
              {formatMinorAmount(payment.amountMinor, displayCurrency)}
            </Text>
          }
        />
      ))}
      <Text
        selectable
        className="pt-2 text-[13px] leading-[18px] text-muted-foreground"
      >
        Suggested payments from each group&apos;s balances.
      </Text>
    </View>
  );
}
