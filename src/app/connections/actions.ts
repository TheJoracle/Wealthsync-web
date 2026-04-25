'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { encrypt } from '@/lib/encryption';
import { PLATFORMS, type Platform } from '@/app/connections/types';

export async function connectPlatform(formData: FormData) {
  const platform = String(formData.get('platform') ?? '') as Platform;
  const apiKey = String(formData.get('api_key') ?? '').trim();
  const apiSecret = String(formData.get('api_secret') ?? '').trim();
  const mode = formData.get('mode') === 'demo' ? 'demo' : 'live';

  if (!PLATFORMS.includes(platform)) return { error: 'Unknown platform' };
  if (!apiKey) return { error: 'API key required' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const payload = JSON.stringify({ api_key: apiKey, api_secret: apiSecret, mode });
  const encrypted = encrypt(payload);

  const { error } = await supabase.from('api_connections').upsert(
    {
      user_id: user.id,
      platform,
      credentials_encrypted: encrypted,
      is_connected: true,
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,platform' },
  );
  if (error) return { error: error.message };

  revalidatePath('/connections');
  return { ok: true };
}

export async function disconnectPlatform(platform: Platform) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('api_connections')
    .delete()
    .eq('platform', platform);
  if (error) return { error: error.message };

  revalidatePath('/connections');
  return { ok: true };
}
