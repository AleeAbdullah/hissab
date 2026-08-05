import { Pressable, Text, View } from 'react-native';

import { Field, SectionLabel } from '@/components/ui';
import type { LedgerDraftMember } from '@/features/ledger/draft';
import { useAppTheme } from '@/theme/theme';

export function MemberAmounts({
  amounts,
  label,
  members,
  selectedUserIds,
  showAmounts = true,
  onAmountsChange,
  onSelectionChange,
}: {
  amounts: Record<string, string>;
  label: string;
  members: LedgerDraftMember[];
  selectedUserIds: string[];
  showAmounts?: boolean;
  onAmountsChange: (amounts: Record<string, string>) => void;
  onSelectionChange: (userIds: string[]) => void;
}) {
  const { colors } = useAppTheme();
  const toggle = (userId: string) => onSelectionChange(selectedUserIds.includes(userId) ? selectedUserIds.filter((id) => id !== userId) : [...selectedUserIds, userId]);
  return (
    <View style={{ gap: 12 }}>
      <SectionLabel>{label}</SectionLabel>
      <View style={{ gap: 8 }}>
        {members.map((member) => {
          const selected = selectedUserIds.includes(member.userId);
          return (
            <View key={member.userId} style={{ gap: 8 }}>
              <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: selected }} onPress={() => toggle(member.userId)} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: selected ? colors.brand : colors.control, backgroundColor: selected ? colors.brand : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                  {selected ? <Text style={{ color: colors.onBrand, fontWeight: '700' }}>✓</Text> : null}
                </View>
                <Text selectable style={{ color: colors.text, fontSize: 16, lineHeight: 24 }}>{member.displayName}</Text>
              </Pressable>
              {selected && showAmounts ? <Field label={`${member.displayName} amount`} placeholder="0.00" keyboardType="decimal-pad" value={amounts[member.userId] ?? ''} onChangeText={(value) => onAmountsChange({ ...amounts, [member.userId]: value })} /> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
