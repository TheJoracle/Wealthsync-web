-- Shared ticker metadata cache: classifications looked up once and reused
-- across all users.  Reads are open to authenticated users; writes go through
-- the service_role client during sync/enrich flows.

create table public.ticker_classifications (
  symbol text primary key,
  name text,
  sector text,
  geography text,
  asset_type text,
  source text default 'curated', -- 'curated' | 'yahoo' | 'twelvedata' | 'manual'
  cached_at timestamptz default now()
);

alter table public.ticker_classifications enable row level security;

create policy "authenticated read" on public.ticker_classifications
  for select to authenticated using (true);
-- No insert/update/delete policies → service_role only.
