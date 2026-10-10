import { createContext } from 'react';
import type { GestureResponderEvent } from 'react-native';

// Shared controls capture the actual native trigger before calling a handler,
// including form handlers that open a dialog indirectly.
export const DialogTriggerContext = createContext<
  ((trigger: GestureResponderEvent['currentTarget']) => void) | null
>(null);
