import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AppHeader } from '@/components/app-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PasswordForm } from '@/components/password-form';
import { EmailForm } from '@/components/email-form';
import { DeleteAccountDialog } from '@/components/delete-account-dialog';

export const metadata = { title: 'Account — WealthSync' };

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const created = user.created_at
    ? new Date(user.created_at).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '—';

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader userEmail={user.email} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Account</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Beheer je inloggegevens en account.
          </p>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account-info</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Email
                  </dt>
                  <dd className="mt-1 font-medium">{user.email}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Lid sinds
                  </dt>
                  <dd className="mt-1 font-medium">{created}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Email wijzigen</CardTitle>
              <p className="text-sm text-muted-foreground">
                Je krijgt een bevestigingslink op het nieuwe adres. De wijziging wordt pas actief na bevestiging.
              </p>
            </CardHeader>
            <CardContent>
              <EmailForm currentEmail={user.email ?? ''} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wachtwoord wijzigen</CardTitle>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>

          <Card className="border-destructive/40">
            <CardHeader>
              <CardTitle className="text-destructive">Gevaarlijke zone</CardTitle>
              <p className="text-sm text-muted-foreground">
                Permanent verwijderen kan niet ongedaan gemaakt worden.
              </p>
            </CardHeader>
            <CardContent>
              <DeleteAccountDialog userEmail={user.email ?? ''} />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
