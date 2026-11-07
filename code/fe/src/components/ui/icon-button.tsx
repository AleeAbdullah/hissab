import type { LucideIcon } from 'lucide-react-native';

import { Button, type ButtonProps } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

// A 48-point square ghost button holding one icon: header actions, close
// buttons, and search toggles. `label` is the accessibility label.
export function IconButton({
  icon,
  label,
  size = 24,
  iconClassName,
  className,
  ...props
}: Omit<ButtonProps, 'children' | 'variant' | 'size'> & {
  icon: LucideIcon;
  label: string;
  size?: number;
  iconClassName?: string;
}) {
  return (
    <Button
      variant="ghost"
      accessibilityLabel={label}
      className={cn('w-12 px-0', className)}
      {...props}
    >
      <Icon
        as={icon}
        size={size}
        className={cn('text-primary', iconClassName)}
      />
    </Button>
  );
}
