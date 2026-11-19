import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoveLeft,
  MoveRight,
  type LucideIcon,
  type LucideProps
} from 'lucide-react-native';
import { cssInterop } from 'nativewind';
import * as React from 'react';
import { useTranslation } from 'react-i18next';

import { TextClassContext } from '@/components/ui/text';
import { isRTL } from '@/i18n/locale';
import { cn } from '@/lib/utils';

// Swap horizontal navigation glyphs so caller transforms remain intact.
const mirroredIcons = new Map<LucideIcon, LucideIcon>([
  [ChevronLeft, ChevronRight],
  [ChevronRight, ChevronLeft],
  [ChevronsLeft, ChevronsRight],
  [ChevronsRight, ChevronsLeft],
  [ArrowLeft, ArrowRight],
  [ArrowRight, ArrowLeft],
  [MoveLeft, MoveRight],
  [MoveRight, MoveLeft]
]);

type IconProps = LucideProps & {
  as: LucideIcon;
} & React.RefAttributes<LucideIcon>;

function IconImpl({ as: IconComponent, ...props }: IconProps) {
  return <IconComponent {...props} />;
}

cssInterop(IconImpl, {
  className: {
    target: 'style',
    nativeStyleToProp: {
      height: 'size',
      width: 'size'
    }
  }
});

function Icon({
  as: IconComponent,
  className,
  size = 14,
  ...props
}: IconProps) {
  const { i18n } = useTranslation();
  const textClass = React.useContext(TextClassContext);
  // The single place that mirrors navigation glyphs; callers never flip icons.
  return (
    <IconImpl
      as={
        isRTL(i18n.language)
          ? (mirroredIcons.get(IconComponent) ?? IconComponent)
          : IconComponent
      }
      className={cn('text-foreground', textClass, className)}
      size={size}
      {...props}
    />
  );
}

export { Icon };
