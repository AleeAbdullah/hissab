import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Height of the software keyboard, or 0 while hidden. `will` events fire
// earlier on iOS so layout changes land together with the keyboard animation.
export function useKeyboardHeight(timing: 'did' | 'will' = 'did') {
  const [height, setHeight] = useState(() => Keyboard.metrics()?.height ?? 0);
  useEffect(() => {
    const early = timing === 'will' && Platform.OS === 'ios';
    const show = Keyboard.addListener(
      early ? 'keyboardWillShow' : 'keyboardDidShow',
      (event) => setHeight(event.endCoordinates.height)
    );
    const hide = Keyboard.addListener(
      early ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setHeight(0)
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [timing]);
  return height;
}
