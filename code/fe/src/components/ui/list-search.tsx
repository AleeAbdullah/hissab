import { useFocusEffect } from 'expo-router';
import { Search, X } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { BackHandler, Keyboard } from 'react-native';

import { Field } from '@/components/ui';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';

export function useListSearch() {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const close = useCallback(() => {
    setSearch('');
    setIsOpen(false);
    Keyboard.dismiss();
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isOpen) return;
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          close();
          return true;
        }
      );
      return () => subscription.remove();
    }, [close, isOpen])
  );

  return {
    search,
    setSearch,
    isOpen,
    toggle: () => (isOpen ? close() : setIsOpen(true))
  };
}

export function ListSearchButton({
  isOpen,
  onPress,
  subject,
  disabled
}: {
  isOpen: boolean;
  onPress: () => void;
  subject: string;
  disabled?: boolean;
}) {
  return (
    <Button
      className="w-12 px-0"
      variant="ghost"
      disabled={disabled}
      accessibilityLabel={
        isOpen ? `Close ${subject} search` : `Search ${subject}`
      }
      accessibilityState={{ expanded: isOpen, disabled }}
      onPress={onPress}
    >
      <Icon as={isOpen ? X : Search} size={24} className="text-primary" />
    </Button>
  );
}

export function ListSearchField({
  label,
  value,
  onChangeText
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <Field
      label={label}
      placeholder="Search by name"
      value={value}
      onChangeText={onChangeText}
      autoFocus
      autoCapitalize="none"
      autoCorrect={false}
      returnKeyType="search"
      onSubmitEditing={() => Keyboard.dismiss()}
      trailing={
        value ? (
          <Button
            className="w-12 px-0"
            variant="ghost"
            accessibilityLabel={`Clear ${label.toLowerCase()}`}
            onPress={() => onChangeText('')}
          >
            <Icon as={X} size={20} className="text-muted-foreground" />
          </Button>
        ) : undefined
      }
    />
  );
}
