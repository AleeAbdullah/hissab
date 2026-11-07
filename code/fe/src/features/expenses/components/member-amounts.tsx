import { Check, Square } from 'lucide-react-native';
import { View, type TextInput } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { Field, SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { LedgerDraftMember } from '@/features/ledger/draft';

export function MemberAmounts({
  amounts,
  displayCurrency,
  label,
  members,
  selectedUserIds,
  showAmounts = true,
  disabled = false,
  onAmountsChange,
  onSelectionChange,
  onAmountRef
}: {
  amounts: Record<string, string>;
  displayCurrency: DisplayCurrency;
  label: string;
  members: LedgerDraftMember[];
  selectedUserIds: string[];
  showAmounts?: boolean;
  disabled?: boolean;
  onAmountsChange: (amounts: Record<string, string>) => void;
  onSelectionChange: (userIds: string[]) => void;
  onAmountRef?: (userId: string, node: TextInput | null) => void;
}) {
  return (
    <View className="gap-3">
      <SectionLabel>{label}</SectionLabel>
      {members.map((member) => {
        const selected = selectedUserIds.includes(member.userId);
        return (
          <View key={member.userId} className="gap-2">
            <Button
              variant="ghost"
              role="checkbox"
              accessibilityLabel={member.displayName}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              className="w-full justify-start rounded-none border-b border-border py-3"
              onPress={() =>
                onSelectionChange(
                  selected
                    ? selectedUserIds.filter((id) => id !== member.userId)
                    : [...selectedUserIds, member.userId]
                )
              }
            >
              <Icon
                as={selected ? Check : Square}
                size={22}
                className="text-primary"
              />
              <Text className="min-w-0 flex-1 text-base font-normal">
                {member.displayName}
              </Text>
            </Button>
            {selected && showAmounts ? (
              <Field
                inputRef={(node) => onAmountRef?.(member.userId, node)}
                label={`${member.displayName} amount (${displayCurrency})`}
                keyboardType="decimal-pad"
                placeholder="0.00"
                editable={!disabled}
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
  );
}
