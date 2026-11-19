import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Text as RNText } from 'react-native';

import { cn } from '@/lib/utils';

const baseClass = cn(
  'text-foreground text-base',
  Platform.select({ web: 'select-text' })
);

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({ className, ...props }: React.ComponentProps<typeof RNText>) {
  const { i18n } = useTranslation();
  const textClass = React.useContext(TextClassContext);
  return (
    <RNText
      className={cn(baseClass, textClass, className)}
      {...props}
      style={[{ writingDirection: i18n.dir() }, props.style]}
    />
  );
}

export { Text, TextClassContext };
