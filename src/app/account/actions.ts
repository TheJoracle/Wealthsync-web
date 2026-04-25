'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password') ?? '').trim();
  if (password.length < 8) return { error: 'Wachtwoord moet minstens 8 tekens zijn' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true, message: 'Wachtwoord bijgewerkt.' };
}

export async function updateEmail(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  if (!email.includes('@')) return { error: 'Ongeldig email-adres' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) return { error: error.message };
  return {
    ok: true,
    message:
      'Bevestigingslink verzonden naar je nieuwe adres. Klik die aan om de wijziging af te ronden.',
  };
}

export async function deleteAccount() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Admin client kan auth.users verwijderen — RLS-cascade ruimt automatisch
  // alle user-owned rows op (assets, transactions, goals, etc.).
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  revalidatePath('/');
  redirect('/login?deleted=1');
}
