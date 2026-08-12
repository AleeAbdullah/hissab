import { useId } from 'react';
import { View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { Field, SectionLabel } from '@/components/ui';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { LedgerDraftMember } from '@/features/ledger/draft';

export function MemberAmounts({
  amounts,
  displayCurrency,
  label,
  members,
  selectedUserIds,
  showAmounts = true,
  onAmountsChange,
  onSelectionChange
}: {
  amounts: Record<string, string>;
  displayCurrency: DisplayCurrency;
  label: string;
  members: LedgerDraftMember[];
  selectedUserIds: string[];
  showAmounts?: boolean;
  onAmountsChange: (amounts: Record<string, string>) => void;
  onSelectionChange: (userIds: string[]) => void;
}) {
  const groupId = useId();
  const toggle = (userId: string) =>
    onSelectionChange(
      selectedUserIds.includes(userId)
        ? selectedUserIds.filter((id) => id !== userId)
        : [...selectedUserIds, userId]
    );
  return (
    <View className="gap-3">
      <SectionLabel>{label}</SectionLabel>
      <View className="gap-2">
        {members.map((member) => {
          const selected = selectedUserIds.includes(member.userId);
          return (
            <View key={member.userId} className="gap-2">
              <View className="min-h-12 flex-row items-center gap-2.5">
                <Checkbox
                  id={`${groupId}-${member.userId}`}
                  checked={selected}
                  onCheckedChange={() => toggle(member.userId)}
                />
                <Label
                  htmlFor={`${groupId}-${member.userId}`}
                  className="text-base"
                >
                  {member.displayName}
                </Label>
              </View>
              {selected && showAmounts ? (
                <Field
                  label={`${member.displayName} amount (${displayCurrency})`}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={amounts[member.userId] ?? ''}
                  onChangeText={(value) =>
                    onAmountsChange({ ...amounts, [member.userId]: value })
                  }
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
