import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service_role key.
 * Bypasses RLS — use ONLY in trusted contexts (cron jobs, admin scripts).
 * Never import this into client components or public API routes without auth.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase admin client missing env vars');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
