import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react-native';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
  type RefObject
} from 'react';
import {
  AccessibilityInfo,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
  View,
  useWindowDimensions,
  type GestureResponderEvent
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { FullWindowOverlay } from 'react-native-screens';

import { Button } from '@/components/ui/button';
import { DialogTriggerContext } from '@/components/ui/dialog-trigger';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type DialogAction = {
  text: string;
  style?: 'cancel' | 'destructive' | 'choice';
  onPress?: () => void;
};

type DialogOptions = { tone?: 'warning' | 'error' | 'success' };

type ShowDialog = (
  title: string,
  body: string,
  actions?: DialogAction[],
  options?: DialogOptions
) => void;

type DialogState = {
  title: string;
  body: string;
  actions: DialogAction[];
  tone?: DialogOptions['tone'];
  trigger: GestureResponderEvent['currentTarget'] | null;
};

const DialogContext = createContext<ShowDialog | null>(null);

export function useDialog() {
  const show = useContext(DialogContext);
  if (!show) throw new Error('useDialog requires DialogProvider.');
  return show;
}

export function DialogProvider({ children }: PropsWithChildren) {
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [visible, setVisible] = useState(false);
  const current = useRef<DialogState | null>(null);
  const queued = useRef<DialogState[]>([]);
  const heading = useRef<View>(null);
  const announced = useRef<DialogState | null>(null);
  const dismissalFrame = useRef<number | null>(null);
  const trigger = useRef<DialogState['trigger']>(null);
  const closing = useRef<{ dialog: DialogState; onPress?: () => void } | null>(
    null
  );

  const captureTrigger = useCallback((target: DialogState['trigger']) => {
    if (!current.current) trigger.current = target;
  }, []);

  const show = useCallback<ShowDialog>((title, body, actions, options) => {
    const next: DialogState = {
      title,
      body,
      actions: actions?.length ? actions : [{ text: 'Done' }],
      tone: options?.tone,
      trigger: trigger.current
    };
    if (current.current) {
      // Ignore repeated taps, but retain distinct asynchronous feedback that
      // arrives while another confirmation is open or dismissing.
      if (
        [current.current, ...queued.current].some(
          (item) => item.title === title && item.body === body
        )
      )
        return;
      queued.current.push(next);
      return;
    }
    current.current = next;
    setDialog(next);
    setVisible(true);
  }, []);

  const close = useCallback((action?: DialogAction) => {
    if (!current.current || closing.current) return;
    closing.current = {
      dialog: current.current,
      // Cancel and Back are always side-effect free.
      onPress: action?.style === 'cancel' ? undefined : action?.onPress
    };
    setVisible(false);
  }, []);

  const announce = useCallback(() => {
    const active = current.current;
    if (!active || announced.current === active || !heading.current) return;
    announced.current = active;
    AccessibilityInfo.sendAccessibilityEvent(heading.current, 'focus');
  }, []);

  const finishDismissal = useCallback(() => {
    const pending = closing.current;
    if (!pending) return;
    closing.current = null;
    setDialog(null);
    // First unhide the underlying accessibility tree, then restore its focus.
    dismissalFrame.current = requestAnimationFrame(() => {
      dismissalFrame.current = null;
      current.current = null;
      const target = pending.dialog.trigger;
      if (target?.isConnected) {
        target.focus();
        AccessibilityInfo.sendAccessibilityEvent(target, 'focus');
      }
      // Native pickers and confirmed effects run after the dialog is removed.
      pending.onPress?.();
      if (!current.current) {
        const next = queued.current.shift();
        if (next) {
          current.current = next;
          setDialog(next);
          setVisible(true);
        }
      }
    });
  }, []);

  useEffect(
    () => () => {
      if (dismissalFrame.current !== null)
        cancelAnimationFrame(dismissalFrame.current);
    },
    []
  );

  useEffect(() => {
    // Both hosts are removed when visible becomes false. Wait for that commit
    // before restoring focus or running the confirmed action.
    if (visible || !dialog) return;
    const frame = requestAnimationFrame(finishDismissal);
    return () => cancelAnimationFrame(frame);
  }, [dialog, finishDismissal, visible]);

  const content = dialog ? (
    <HissabDialog
      dialog={dialog}
      heading={heading}
      onClose={close}
      onReady={Platform.OS === 'ios' ? announce : undefined}
    />
  ) : null;

  return (
    <DialogContext.Provider value={show}>
      <DialogTriggerContext.Provider value={captureTrigger}>
        <View
          className="flex-1"
          accessibilityElementsHidden={Boolean(dialog)}
          importantForAccessibility={dialog ? 'no-hide-descendants' : 'auto'}
        >
          {children}
        </View>
        {Platform.OS === 'ios' ? (
          visible ? (
            <FullWindowOverlay unstable_accessibilityContainerViewIsModal>
              {content}
            </FullWindowOverlay>
          ) : null
        ) : (
          <Modal
            transparent
            visible={visible}
            animationType="none"
            statusBarTranslucent
            navigationBarTranslucent
            onRequestClose={() => close()}
            onShow={announce}
          >
            {content}
          </Modal>
        )}
      </DialogTriggerContext.Provider>
    </DialogContext.Provider>
  );
}

function HissabDialog({
  dialog,
  heading,
  onClose,
  onReady
}: {
  dialog: DialogState;
  heading: RefObject<View | null>;
  onClose: (action?: DialogAction) => void;
  onReady?: () => void;
}) {
  const { fontScale } = useWindowDimensions();
  // Unlike a native Modal, the window overlay keeps an already-open keyboard.
  const [keyboardHeight, setKeyboardHeight] = useState(() =>
    Platform.OS === 'ios' ? (Keyboard.metrics()?.height ?? 0) : 0
  );
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (event) =>
      setKeyboardHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener('keyboardWillHide', () =>
      setKeyboardHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const stacked =
    dialog.actions.length >= 3 ||
    fontScale >= 1.3 ||
    dialog.actions.some((action) => action.text.length > 16);
  const actions = [
    ...dialog.actions.filter((action) =>
      stacked ? action.style !== 'cancel' : action.style === 'cancel'
    ),
    ...dialog.actions.filter((action) =>
      stacked ? action.style === 'cancel' : action.style !== 'cancel'
    )
  ];
  const tone = dialog.tone;

  return (
    <SafeAreaProvider>
      <View
        pointerEvents="none"
        accessible={false}
        className="absolute inset-0 bg-scrim opacity-50 dark:opacity-70"
      />
      <View className="flex-1" style={{ paddingBottom: keyboardHeight }}>
        <SafeAreaView className="flex-1 items-center justify-center p-5">
          <View
            role="dialog"
            accessibilityViewIsModal
            onAccessibilityEscape={() => onClose()}
            onLayout={onReady}
            className="w-full max-w-[400px] shrink rounded-[20px] border-hairline border-border bg-popover p-6"
            style={{ maxHeight: '100%' }}
          >
            {tone ? (
              <Icon
                as={
                  tone === 'warning'
                    ? TriangleAlert
                    : tone === 'error'
                      ? CircleAlert
                      : CircleCheck
                }
                size={24}
                accessible={false}
                className={cn(
                  'mb-4',
                  tone === 'warning'
                    ? 'text-warning'
                    : tone === 'error'
                      ? 'text-destructive'
                      : 'text-positive'
                )}
              />
            ) : null}
            <View
              ref={heading}
              accessible
              accessibilityRole="header"
              accessibilityLabel={`${dialog.title}. ${dialog.body}`}
            >
              <Text className="text-xl font-semibold leading-7 text-popover-foreground">
                {dialog.title}
              </Text>
            </View>
            <ScrollView
              className="mt-2 shrink"
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior="never"
            >
              <Text className="text-base leading-6 text-popover-foreground">
                {dialog.body}
              </Text>
            </ScrollView>
            <View className={cn('mt-6 gap-2', !stacked && 'flex-row')}>
              {actions.map((action) => (
                <Button
                  key={action.text}
                  variant={
                    action.style === 'cancel'
                      ? 'ghost'
                      : action.style === 'destructive'
                        ? 'destructive'
                        : action.style === 'choice'
                          ? 'outline'
                          : 'default'
                  }
                  className={cn(!stacked && 'flex-1')}
                  style={{ minHeight: Platform.OS === 'ios' ? 44 : 48 }}
                  onPress={() => onClose(action)}
                >
                  <Text
                    className={cn(
                      'text-center text-base font-semibold leading-6',
                      action.style === 'cancel' && 'text-foreground'
                    )}
                  >
                    {action.text}
                  </Text>
                </Button>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </SafeAreaProvider>
  );
}
