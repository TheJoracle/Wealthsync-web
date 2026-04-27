import { cookies } from 'next/headers';
import { LOCALES, t as tBase, type Locale, type MessageKey } from './dictionaries';

export const LOCALE_COOKIE = 'wealthsync-lang';

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const fromCookie = store.get(LOCALE_COOKIE)?.value;
  if (fromCookie && (LOCALES as readonly string[]).includes(fromCookie)) {
    return fromCookie as Locale;
  }
  return 'nl';
}

export async function getT(): Promise<(key: MessageKey) => string> {
  const locale = await getLocale();
  return (key) => tBase(locale, key);
}
