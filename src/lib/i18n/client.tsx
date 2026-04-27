'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { t as tBase, type Locale, type MessageKey } from './dictionaries';

const LocaleContext = createContext<Locale>('nl');

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

export function useT(): (key: MessageKey) => string {
  const locale = useLocale();
  return useMemo(() => (key) => tBase(locale, key), [locale]);
}
