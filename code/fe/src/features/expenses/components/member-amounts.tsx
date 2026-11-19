import { Check } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { TextInput, View } from 'react-native';

import type { DisplayCurrency } from '@/api/contracts';
import { currencySymbol, DONE_BAR_ID } from '@/components/amount-field';
import { SectionLabel } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { surfaceVariants } from '@/components/ui/surface';
import { Text } from '@/components/ui/text';
import type { LedgerDraftMember } from '@/features/ledger/draft';
import { isolate } from '@/i18n';
import { logicalTextAlign } from '@/i18n/locale';
import { cn } from '@/lib/utils';

// One row per member: tick and name at the start, their amount at the end.
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
  const { t, i18n } = useTranslation(['expenses', 'common']);
  return (
    <View>
      <SectionLabel>{label}</SectionLabel>
      {members.map((member) => {
        const selected = selectedUserIds.includes(member.userId);
        return (
          <View
            key={member.userId}
            className="min-h-14 flex-row items-center gap-3 border-b border-border"
          >
            <Button
              variant="ghost"
              role="checkbox"
              accessibilityLabel={member.displayName}
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              className="flex-1 justify-start gap-3 rounded-none px-0"
              onPress={() =>
                onSelectionChange(
                  selected
                    ? selectedUserIds.filter((id) => id !== member.userId)
                    : [...selectedUserIds, member.userId]
                )
              }
            >
              <View
                className={cn(
                  'size-6 items-center justify-center rounded-md border-2 border-primary',
                  selected && 'bg-primary'
                )}
              >
                {selected ? (
                  <Icon
                    as={Check}
                    size={16}
                    strokeWidth={3}
                    className="text-primary-foreground"
                  />
                ) : null}
              </View>
              <Text className="min-w-0 flex-1 text-base font-normal">
                {member.displayName}
              </Text>
            </Button>
            {selected && showAmounts ? (
              <View
                className={cn(
                  surfaceVariants({ variant: 'control' }),
                  'min-h-11 w-32 flex-row items-center gap-1 px-3'
                )}
              >
                <Text className="text-base text-muted-foreground">
                  {currencySymbol(displayCurrency)}
                </Text>
                <TextInput
                  ref={(node) => onAmountRef?.(member.userId, node)}
                  inputAccessoryViewID={DONE_BAR_ID}
                  accessibilityLabel={t('memberAmount', {
                    name: isolate(member.displayName)
                  })}
                  keyboardType="decimal-pad"
                  placeholder={t('amountPlaceholder')}
                  editable={!disabled}
                  value={amounts[member.userId] ?? ''}
                  onChangeText={(value) =>
                    onAmountsChange({ ...amounts, [member.userId]: value })
                  }
                  className="flex-1 py-0 text-base leading-5 text-foreground placeholder:text-muted-foreground"
                  style={{ textAlign: logicalTextAlign('end', i18n.language) }}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
