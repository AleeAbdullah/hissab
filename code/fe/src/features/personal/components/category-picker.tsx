import {
  BedDouble,
  BriefcaseBusiness,
  BusFront,
  Check,
  Clapperboard,
  CircleDollarSign,
  Gift,
  HeartPulse,
  PlugZap,
  RotateCcw,
  Shapes,
  ShoppingBag,
  ShoppingBasket,
  Store,
  UtensilsCrossed,
  Wallet,
  type LucideIcon
} from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import type { PersonalCategoryCode } from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

export const CATEGORY_ICONS: Record<PersonalCategoryCode, LucideIcon> = {
  FOOD_AND_DRINK: UtensilsCrossed,
  GROCERIES: ShoppingBasket,
  TRANSPORT: BusFront,
  ACCOMMODATION: BedDouble,
  UTILITIES: PlugZap,
  ENTERTAINMENT: Clapperboard,
  SHOPPING: ShoppingBag,
  HEALTHCARE: HeartPulse,
  OTHER: Shapes,
  SALARY: Wallet,
  FREELANCE: BriefcaseBusiness,
  BUSINESS: Store,
  GIFTS: Gift,
  REFUNDS: RotateCcw,
  OTHER_INCOME: CircleDollarSign
};

// Shared by personal transactions and shared expenses.
export function CategoryPicker<T extends PersonalCategoryCode>({
  categories,
  loading,
  disabled,
  onChange,
  value
}: {
  categories: { code: T; name: string }[];
  loading: boolean;
  disabled?: boolean;
  onChange: (code: T) => void;
  value: T | null;
}) {
  if (loading)
    return (
      <View className="min-h-12 items-start justify-center">
        <ActivityIndicator
          accessibilityLabel="Loading categories"
          className="text-primary"
        />
      </View>
    );
  return (
    <View
      accessibilityLabel="Category"
      accessibilityRole="radiogroup"
      className="flex-row flex-wrap gap-y-2"
    >
      {categories.map((category) => {
        const selected = category.code === value;
        return (
          <Button
            key={category.code}
            variant="ghost"
            role="radio"
            accessibilityLabel={category.name}
            disabled={disabled}
            accessibilityState={{ checked: selected, disabled }}
            className="h-auto w-1/4 flex-col justify-start gap-1.5 px-0.5 py-1"
            onPress={() => onChange(category.code)}
          >
            <View
              className={cn(
                'size-12 items-center justify-center rounded-full bg-muted',
                selected && 'bg-primary'
              )}
            >
              <Icon
                as={CATEGORY_ICONS[category.code]}
                size={22}
                className={
                  selected ? 'text-primary-foreground' : 'text-foreground'
                }
              />
              {selected ? (
                <View className="absolute -bottom-0.5 -right-0.5 size-5 items-center justify-center rounded-full border border-border bg-card">
                  <Icon as={Check} size={12} className="text-primary" />
                </View>
              ) : null}
            </View>
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              className={cn(
                'text-center text-xs leading-4',
                selected
                  ? 'font-semibold text-primary'
                  : 'font-normal text-foreground'
              )}
            >
              {category.name}
            </Text>
          </Button>
        );
      })}
    </View>
  );
}
