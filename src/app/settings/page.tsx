import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemePref } from '@/components/theme-pref';
import { LanguagePicker } from '@/components/language-picker';
import { buttonVariants } from '@/components/ui/button';
import { getLocale } from '@/lib/i18n/server';
import { t as translate } from '@/lib/i18n/dictionaries';

export const metadata = { title: 'Instellingen — WealthSync' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const locale = await getLocale();
  const t = (k: Parameters<typeof translate>[1]) => translate(locale, k);

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">{t('page.settings.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('page.settings.description')}</p>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appearance')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('settings.appearance.description')}</p>
            </CardHeader>
            <CardContent>
              <ThemePref />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.language')}</CardTitle>
              <p className="text-sm text-muted-foreground">{t('settings.language.description')}</p>
            </CardHeader>
            <CardContent>
              <LanguagePicker current={locale} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Broker-connecties</CardTitle>
              <p className="text-sm text-muted-foreground">
                Beheer je gekoppelde brokers.
              </p>
            </CardHeader>
            <CardContent>
              <Link href="/connections" className={buttonVariants({ variant: 'outline' })}>
                Naar connecties
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <p className="text-sm text-muted-foreground">
                Wijzig email, wachtwoord, of verwijder je account.
              </p>
            </CardHeader>
            <CardContent>
              <Link href="/account" className={buttonVariants({ variant: 'outline' })}>
                Naar account
              </Link>
            </CardContent>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-muted-foreground">Komt later</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1 text-sm text-muted-foreground">
                <li>· Email-notificaties bij price-alerts</li>
                <li>· Taal (NL / EN)</li>
                <li>· Standaard tijd-range voor charts</li>
                <li>· Standaard valuta</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
