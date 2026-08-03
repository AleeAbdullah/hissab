import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native';

import { useAppTheme } from '@/theme/use-app-theme';

const fallbackCurrencies = ['AED', 'AUD', 'CAD', 'EUR', 'GBP', 'INR', 'PKR', 'USD'];

function currencies() {
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
  return supportedValuesOf?.('currency') ?? fallbackCurrencies;
}

export function CurrencyPicker({ value, onChange }: { value?: string; onChange: (value: string) => void }) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const codes = useMemo(
    () => currencies().filter((code) => code.includes(search.trim().toUpperCase())),
    [search],
  );

  return (
    <>
      <Text selectable style={{ color: colors.secondary, fontSize: 13 }}>Default currency</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose default currency"
        onPress={() => setOpen(true)}
        style={{ minHeight: 48, borderWidth: 1, borderColor: colors.control, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.surface, paddingHorizontal: 12, justifyContent: 'center' }}
      >
        <Text style={{ color: value ? colors.text : colors.secondary, fontSize: 17 }}>{value ?? 'Choose a currency'}</Text>
      </Pressable>
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: colors.canvas, paddingTop: 16 }}>
          <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 12 }}>
            <Text selectable style={{ flex: 1, color: colors.text, fontSize: 20, fontWeight: '600' }}>Choose currency</Text>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ minWidth: 44, minHeight: 44, justifyContent: 'center', alignItems: 'flex-end' }}>
              <Text style={{ color: colors.brand, fontSize: 17, fontWeight: '600' }}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            accessibilityLabel="Search currency code"
            autoCapitalize="characters"
            placeholder="Search currency code"
            placeholderTextColor={colors.secondary}
            value={search}
            onChangeText={setSearch}
            style={{ margin: 16, minHeight: 44, paddingHorizontal: 12, borderRadius: 12, borderCurve: 'continuous', backgroundColor: colors.surfaceSubtle, color: colors.text, fontSize: 17 }}
          />
          <FlatList
            data={codes}
            keyExtractor={(code) => code}
            contentInsetAdjustmentBehavior="automatic"
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                onPress={() => { onChange(item); setOpen(false); setSearch(''); }}
                style={{ minHeight: 52, marginHorizontal: 16, paddingHorizontal: 12, justifyContent: 'center', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.divider }}
              >
                <Text style={{ color: colors.text, fontSize: 17 }}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      </Modal>
    </>
  );
}
