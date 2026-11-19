import * as SelectPrimitive from '@rn-primitives/select';
import * as React from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View
} from 'react-native';
import { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FullWindowOverlay as RNFullWindowOverlay } from 'react-native-screens';

import { Icons } from '@/components/icons';
import { Icon } from '@/components/ui/icon';
import { NativeOnlyAnimatedView } from '@/components/ui/native-only-animated-view';
import { surfaceVariants } from '@/components/ui/surface';
import { TextClassContext } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type Option = SelectPrimitive.Option;

const Select = SelectPrimitive.Root;

const SelectGroup = SelectPrimitive.Group;

function SelectValue({
  ref,
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value> & {
  className?: string;
}) {
  const { value } = SelectPrimitive.useRootContext();
  return (
    <SelectPrimitive.Value
      ref={ref}
      className={cn(
        'line-clamp-1 flex flex-row items-center gap-2 text-[17px] text-foreground',
        !value && 'text-muted-foreground',
        className
      )}
      {...props}
    />
  );
}

function SelectTrigger({
  ref,
  className,
  children,
  size = 'default',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  children?: React.ReactNode;
  size?: 'default' | 'sm';
}) {
  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        surfaceVariants({ variant: 'control' }),
        'flex flex-row items-center justify-between gap-2 px-3 py-2',
        Platform.select({
          web: 'focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:hover:bg-input/50 w-fit whitespace-nowrap text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0'
        }),
        props.disabled && 'opacity-50',
        size === 'sm' && 'min-h-12 py-2',
        className
      )}
      {...props}
    >
      <>{children}</>
      <Icon
        as={Icons.chevronDown}
        aria-hidden={true}
        className="size-4 text-muted-foreground"
      />
    </SelectPrimitive.Trigger>
  );
}

const FullWindowOverlay =
  Platform.OS === 'ios' ? RNFullWindowOverlay : React.Fragment;

function SelectContent({
  className,
  children,
  position = 'popper',
  portalHost,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content> & {
  className?: string;
  portalHost?: string;
}) {
  const safeArea = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const insets = {
    top: safeArea.top + 20,
    bottom: safeArea.bottom + 20,
    left: safeArea.left + 20,
    right: safeArea.right + 20,
    ...props.insets
  };
  const maxHeight = Math.max(48, height - insets.top - insets.bottom - 16);
  return (
    <SelectPrimitive.Portal hostName={portalHost}>
      <FullWindowOverlay>
        <SelectPrimitive.Overlay
          style={Platform.select({ native: StyleSheet.absoluteFill })}
          asChild={Platform.OS !== 'web'}
        >
          <NativeOnlyAnimatedView
            className="z-50"
            entering={FadeIn.reduceMotion(ReduceMotion.System)}
            exiting={FadeOut.reduceMotion(ReduceMotion.System)}
            as="Pressable"
          >
            <TextClassContext.Provider value="text-popover-foreground">
              <SelectPrimitive.Content
                className={cn(
                  'relative z-50 min-w-[8rem] rounded-[20px] border border-border bg-popover',
                  Platform.select({
                    web: cn(
                      'origin-(--radix-select-content-transform-origin) max-h-52 overflow-y-auto overflow-x-hidden animate-in fade-in-0 zoom-in-95',
                      props.side === 'bottom' && 'slide-in-from-top-2',
                      props.side === 'top' && 'slide-in-from-bottom-2'
                    ),
                    native: 'p-1'
                  }),
                  position === 'popper' &&
                    Platform.select({
                      web: cn(
                        props.side === 'bottom' && 'translate-y-1',
                        props.side === 'top' && '-translate-y-1'
                      )
                    }),
                  className
                )}
                position={position}
                {...props}
                insets={insets}
              >
                <SelectPrimitive.Viewport
                  className={cn(
                    'p-1',
                    position === 'popper' &&
                      cn(
                        'w-full',
                        Platform.select({
                          web: 'h-[var(--radix-select-trigger-height)] min-w-[var(--radix-select-trigger-width)]'
                        })
                      )
                  )}
                >
                  {Platform.OS === 'web' ? (
                    children
                  ) : (
                    <ScrollView
                      style={{ maxHeight }}
                      bounces={false}
                      nestedScrollEnabled
                      keyboardShouldPersistTaps="handled"
                    >
                      {children}
                    </ScrollView>
                  )}
                </SelectPrimitive.Viewport>
              </SelectPrimitive.Content>
            </TextClassContext.Provider>
          </NativeOnlyAnimatedView>
        </SelectPrimitive.Overlay>
      </FullWindowOverlay>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'group relative flex min-h-12 w-full flex-row items-center gap-2 rounded-xl py-2 pe-10 ps-3 active:bg-accent',
        Platform.select({
          web: '*:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2 cursor-default outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none [&_svg]:pointer-events-none'
        }),
        props.disabled && 'opacity-50',
        className
      )}
      {...props}
    >
      <View className="absolute end-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Icon
            as={Icons.check}
            className="size-4 shrink-0 text-muted-foreground"
          />
        </SelectPrimitive.ItemIndicator>
      </View>
      <SelectPrimitive.ItemText className="select-none text-sm text-foreground group-active:text-accent-foreground" />
    </SelectPrimitive.Item>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type Option
};
