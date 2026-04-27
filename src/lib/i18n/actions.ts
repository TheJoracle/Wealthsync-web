'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { LOCALES, type Locale } from './dictionaries';
import { LOCALE_COOKIE } from './server';

export async function setLocale(formData: FormData) {
  const next = String(formData.get('locale') ?? '');
  if (!(LOCALES as readonly string[]).includes(next)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, next as Locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  });
  const back = String(formData.get('back') ?? '/settings');
  redirect(back);
}
