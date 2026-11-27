import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { queryClient } from '@/api/query-client';
import { getLoginVersion, getTokens } from '@/api/session-store';
import { useDialog } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Text } from '@/components/ui/text';
import { profileQuery, updateProfile } from '@/features/account/api';
import { setLocale } from '@/i18n';
import {
  isLocale,
  isRTL,
  languageNames,
  locales,
  type Locale
} from '@/i18n/locale';

export function LocalePicker({ savedLocale }: { savedLocale?: Locale }) {
  const { t, i18n } = useTranslation(['account', 'common']);
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);
  const currentLocale = i18n.language as Locale;
  const value = savedLocale ?? currentLocale;
  const apply = async (locale: Locale) => {
    if (!getTokens()) return;
    const loginVersion = getLoginVersion();
    setBusy(true);
    try {
      await queryClient.cancelQueries({ queryKey: profileQuery.queryKey });
      if (getLoginVersion() !== loginVersion) return;
      const profile = await updateProfile({ locale });
      await queryClient.cancelQueries({ queryKey: profileQuery.queryKey });
      if (getTokens()?.user.id !== profile.id) return;
      if (getLoginVersion() !== loginVersion) {
        await queryClient.invalidateQueries({
          queryKey: profileQuery.queryKey
        });
        return;
      }
      queryClient.setQueryData(profileQuery.queryKey, profile);
      const invalidation = queryClient.invalidateQueries({
        queryKey: ['home']
      });
      await setLocale(profile.locale);
      await invalidation;
    } catch {
      if (getLoginVersion() !== loginVersion) return;
      dialog(t('language'), t('changeFailed'), [{ text: t('common:done') }], {
        tone: 'error'
      });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Select
      value={{ value, label: languageNames[value] }}
      onValueChange={(option) => {
        if (
          busy ||
          !option ||
          !isLocale(option.value) ||
          (option.value === value && option.value === currentLocale)
        )
          return;
        const locale = option.value;
        if (isRTL(locale) !== isRTL(currentLocale)) {
          dialog(t('restartTitle'), t('restartBody'), [
            { text: t('common:cancel'), style: 'cancel' },
            {
              text: t('restart'),
              onPress: () => {
                void apply(locale);
              }
            }
          ]);
        } else {
          void apply(locale);
        }
      }}
    >
      {/* Styled as a settings Row so it matches the rows around it in the card. */}
      <SelectTrigger
        disabled={busy}
        accessibilityLabel={t('language')}
        className="min-h-[52px] w-full gap-3 rounded-none border-0 border-b border-border bg-transparent px-4 py-3"
      >
        <Text className="flex-1 text-[17px] font-semibold leading-[23px]">
          {t('language')}
        </Text>
        <SelectValue
          placeholder={t('chooseLanguage')}
          className="text-[15px] font-semibold leading-5 text-muted-foreground"
        />
      </SelectTrigger>
      {/* Open under the value, which sits at the row's end (physical left in RTL). */}
      <SelectContent align={isRTL(currentLocale) ? 'start' : 'end'}>
        <SelectGroup>
          {locales.map((locale) => (
            <SelectItem
              key={locale}
              label={languageNames[locale]}
              value={locale}
            >
              {languageNames[locale]}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
