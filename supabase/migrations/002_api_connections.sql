-- API connections for broker integrations (Trading212, Bitvavo, ...)
-- Credentials are encrypted application-side with AES-256-GCM before storage.
-- The service_role key is needed to read the encrypted blob and decrypt server-side.

create table public.api_connections (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null,
  credentials_encrypted text not null,
  is_connected boolean default true,
  last_sync timestamptz,
  last_sync_error text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id, platform)
);
create index api_connections_user_idx on public.api_connections(user_id);

alter table public.api_connections enable row level security;

-- Users can see and manage their own connections. The encrypted_credentials
-- column is useless without the server-side ENCRYPTION_KEY, so exposing it
-- via SELECT is safe.
create policy "own rows select" on public.api_connections for select using (auth.uid() = user_id);
create policy "own rows insert" on public.api_connections for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.api_connections for update using (auth.uid() = user_id);
create policy "own rows delete" on public.api_connections for delete using (auth.uid() = user_id);
