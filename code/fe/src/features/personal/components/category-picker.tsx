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

import type { PersonalCategory, PersonalCategoryCode } from '@/api/contracts';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';

const CATEGORY_ICONS: Partial<Record<PersonalCategoryCode, LucideIcon>> = {
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

export function CategoryPicker({
  categories,
  loading,
  onChange,
  value
}: {
  categories: PersonalCategory[];
  loading: boolean;
  onChange: (code: PersonalCategoryCode) => void;
  value: PersonalCategoryCode | null;
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
      className="flex-row flex-wrap gap-3"
    >
      {categories.map((category) => {
        const selected = category.code === value;
        return (
          <Button
            key={category.code}
            variant="ghost"
            role="radio"
            accessibilityLabel={category.name}
            accessibilityState={{ checked: selected }}
            className={
              selected
                ? 'min-h-12 gap-2 rounded-xl border border-primary bg-accent px-3 py-2'
                : 'min-h-12 gap-2 rounded-xl border border-border bg-card px-3 py-2'
            }
            onPress={() => onChange(category.code)}
          >
            <Icon
              as={CATEGORY_ICONS[category.code] ?? Shapes}
              size={18}
              className={selected ? 'text-primary' : 'text-muted-foreground'}
            />
            <Text
              className={
                selected
                  ? 'text-[15px] font-semibold leading-5 text-primary'
                  : 'text-[15px] font-normal leading-5 text-foreground'
              }
            >
              {category.name}
            </Text>
            {selected ? (
              <Icon as={Check} size={16} className="text-primary" />
            ) : null}
          </Button>
        );
      })}
    </View>
  );
}
