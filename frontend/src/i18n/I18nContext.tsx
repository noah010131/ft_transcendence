import { createContext, useMemo, useState, type ReactNode } from 'react';
import { en } from './messages/en';
import { ko } from './messages/ko';
import { fr } from './messages/fr';
import type { Locale, Messages } from '../types/i18n';

type I18nContextValue = {
  locale: Locale;
  messages: Messages;
  setLocale: (locale: Locale) => void;
};

const messageMap: Record<Locale, Messages> = {
  en,
  ko,
  fr,
};

export const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  children: ReactNode;
};

export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocale] = useState<Locale>('en');

  const value = useMemo(
    () => ({
      locale,
      messages: messageMap[locale],
      setLocale,
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}