import { cva, type VariantProps } from 'class-variance-authority';
import { useContext } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { DialogTriggerContext } from '@/components/ui/dialog-trigger';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  cn(
    'shrink-0 flex-row items-center justify-center gap-2 rounded-xl',
    Platform.select({
      web: "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive whitespace-nowrap outline-none transition-all focus-visible:ring-[3px] disabled:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0"
    })
  ),
  {
    variants: {
      variant: {
        default: cn(
          'bg-primary active:bg-primary/90',
          Platform.select({ web: 'hover:bg-primary/90' })
        ),
        destructive: cn(
          'bg-destructive active:bg-destructive/90',
          Platform.select({
            web: 'hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40'
          })
        ),
        outline: cn(
          'border-primary bg-transparent active:bg-accent border',
          Platform.select({
            web: 'hover:bg-accent'
          })
        ),
        destructiveOutline: cn(
          'border-destructive bg-transparent active:bg-destructive/10 border',
          Platform.select({ web: 'hover:bg-destructive/10' })
        ),
        secondary: cn(
          'bg-secondary active:bg-secondary/80',
          Platform.select({ web: 'hover:bg-secondary/80' })
        ),
        ghost: cn(
          'active:bg-accent dark:active:bg-accent/50',
          Platform.select({ web: 'hover:bg-accent dark:hover:bg-accent/50' })
        ),
        link: ''
      },
      size: {
        default: cn(
          'min-h-12 px-4 py-2',
          Platform.select({ web: 'has-[>svg]:px-3' })
        ),
        compact: 'min-h-8 px-3 py-1.5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

const buttonTextVariants = cva(
  cn(
    'text-foreground text-[17px] font-semibold',
    Platform.select({ web: 'pointer-events-none transition-colors' })
  ),
  {
    variants: {
      variant: {
        default: 'text-primary-foreground',
        destructive: 'text-destructive-foreground',
        outline: 'text-primary',
        destructiveOutline: 'text-destructive',
        secondary: 'text-secondary-foreground',
        ghost: 'group-active:text-accent-foreground',
        link: cn(
          'text-primary group-active:underline',
          Platform.select({
            web: 'underline-offset-4 hover:underline group-hover:underline'
          })
        )
      },
      size: {
        default: '',
        compact: 'text-[15px] leading-5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

type ButtonProps = React.ComponentProps<typeof Pressable> &
  React.RefAttributes<typeof Pressable> &
  VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant,
  size = 'default',
  onPress,
  children,
  ...props
}: ButtonProps) {
  const captureTrigger = useContext(DialogTriggerContext);
  const filled =
    !variant || ['default', 'destructive', 'secondary'].includes(variant);
  const disabledFill = props.disabled && filled;
  const bodyClass = cn(
    buttonVariants({ variant, size }),
    className,
    disabledFill && 'bg-muted'
  );
  return (
    <TextClassContext.Provider
      value={cn(
        buttonTextVariants({ variant, size }),
        disabledFill && 'text-muted-foreground'
      )}
    >
      <Pressable
        role="button"
        {...props}
        accessibilityState={{
          ...props.accessibilityState,
          disabled: Boolean(props.disabled)
        }}
        className={
          size === 'compact'
            ? cn(
                'group min-w-12 shrink justify-center',
                Platform.OS === 'ios' ? 'min-h-11' : 'min-h-12'
              )
            : cn('group', bodyClass)
        }
        onPress={
          onPress
            ? (event) => {
                captureTrigger?.(event.currentTarget);
                onPress(event);
              }
            : undefined
        }
      >
        {size === 'compact'
          ? (state) => (
              <View
                pointerEvents="none"
                accessible={false}
                focusable={false}
                className={cn(
                  'max-w-full',
                  bodyClass,
                  state.pressed && !props.disabled && 'opacity-80'
                )}
              >
                {typeof children === 'function' ? children(state) : children}
              </View>
            )
          : children}
      </Pressable>
    </TextClassContext.Provider>
  );
}

export { Button, buttonTextVariants, buttonVariants };
export type { ButtonProps };
