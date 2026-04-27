import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ResetPasswordForm } from '@/components/reset-password-form';
import { ThemeToggle } from '@/components/theme-toggle';

export const metadata = { title: 'Nieuw wachtwoord — WealthSync' };

export default async function ResetPasswordPage() {
  // The /auth/callback handler exchanges the recovery code for a session
  // and forwards us here. If we're not signed in by this point the link
  // expired or was tampered with — bounce back to login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?error=expired_recovery');

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="bg-gradient-to-r from-[var(--brand)] to-[var(--brand-secondary)] bg-clip-text text-2xl font-black text-transparent">
            WealthSync
          </span>
          <ThemeToggle />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-lg">
          <h2 className="mb-2 text-2xl font-bold">Nieuw wachtwoord instellen</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Je bent ingelogd via de reset-link. Stel hieronder een nieuw wachtwoord in.
          </p>
          <ResetPasswordForm />
        </div>
      </main>
    </div>
  );
}
