-- WealthSync initial schema
-- Per-user data is isolated via RLS (user_id = auth.uid())
-- Benchmark data is shared reference data (select-all, service_role writes only)

-- =========================================================================
-- 1. Per-user portfolio tables
-- =========================================================================

create table public.assets (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  symbol text not null,
  type text not null,
  amount numeric not null,
  value numeric not null,
  purchase_price numeric default 0,
  notes text default '',
  source text default 'manual',
  dividend_yield numeric,
  next_ex_date date,
  payment_frequency text,
  sector text,
  geography text,
  last_updated timestamptz default now(),
  created_at timestamptz default now()
);
create index assets_user_id_idx on public.assets(user_id);
create index assets_symbol_idx on public.assets(symbol);

create table public.portfolio_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  total_value numeric not null,
  etf_value numeric not null default 0,
  crypto_value numeric not null default 0,
  commodity_value numeric not null default 0,
  stock_value numeric default 0,
  created_at timestamptz default now(),
  unique(user_id, date)
);
create index portfolio_history_user_date_idx on public.portfolio_history(user_id, date);

create table public.portfolio_snapshots (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  total_value numeric not null,
  total_invested numeric,
  cash_flow numeric,
  benchmark_value numeric,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);
create index portfolio_snapshots_user_date_idx on public.portfolio_snapshots(user_id, date);

create table public.asset_price_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id bigint not null references public.assets(id) on delete cascade,
  symbol text not null,
  price numeric not null,
  date timestamptz not null,
  created_at timestamptz default now()
);
create index asset_price_history_asset_idx on public.asset_price_history(asset_id, date);
create index asset_price_history_user_idx on public.asset_price_history(user_id);

create table public.asset_sectors (
  id bigserial primary key,
  asset_id bigint not null unique references public.assets(id) on delete cascade,
  sector text,
  industry text,
  geography text,
  last_updated timestamptz default now()
);

create table public.transactions (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id bigint references public.assets(id) on delete set null,
  type text not null,
  symbol text,
  quantity numeric,
  price_per_unit numeric,
  total_value numeric not null,
  currency text default 'EUR',
  fees numeric default 0,
  notes text,
  transaction_date date not null,
  tax_lot_id text,
  wash_sale_disallowed numeric default 0,
  is_reinvested_dividend boolean default false,
  created_at timestamptz default now()
);
create index transactions_user_idx on public.transactions(user_id);
create index transactions_asset_idx on public.transactions(asset_id);
create index transactions_date_idx on public.transactions(transaction_date);

create table public.goals (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric not null,
  current_amount numeric default 0,
  target_date date,
  status text default 'active',
  completed_at timestamptz,
  created_at timestamptz default now()
);
create index goals_user_idx on public.goals(user_id);

create table public.dividend_payments (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id bigint not null references public.assets(id) on delete cascade,
  symbol text not null,
  amount_per_share numeric not null,
  total_amount numeric not null,
  payment_date date not null,
  ex_dividend_date date,
  record_date date,
  currency text default 'EUR',
  dividend_type text default 'regular',
  source_country text default 'NL',
  withholding_tax_rate numeric default 0,
  withholding_tax_amount numeric default 0,
  net_amount numeric,
  notes text,
  created_at timestamptz default now()
);
create index dividend_payments_user_idx on public.dividend_payments(user_id);
create index dividend_payments_asset_idx on public.dividend_payments(asset_id);

create table public.price_alerts (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id bigint not null references public.assets(id) on delete cascade,
  symbol text not null,
  target_price numeric not null,
  condition text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
create index price_alerts_user_idx on public.price_alerts(user_id);

create table public.retirement_scenarios (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  current_age integer not null,
  retirement_age integer not null,
  current_savings numeric not null,
  monthly_contribution numeric not null,
  expected_return_rate numeric not null,
  projected_savings numeric,
  last_calculated timestamptz,
  created_at timestamptz default now()
);
create index retirement_scenarios_user_idx on public.retirement_scenarios(user_id);

create table public.box3_snapshots (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  snapshot_date date not null,
  year integer not null,
  total_wealth numeric not null,
  tax_free_allowance numeric default 57000,
  taxable_wealth numeric,
  bracket1_amount numeric,
  bracket1_rate numeric,
  bracket2_amount numeric,
  bracket2_rate numeric,
  bracket3_amount numeric,
  bracket3_rate numeric,
  deemed_return numeric,
  tax_rate numeric default 0.36,
  estimated_tax numeric,
  notes text,
  created_at timestamptz default now(),
  unique(user_id, snapshot_date)
);
create index box3_snapshots_user_idx on public.box3_snapshots(user_id);

-- =========================================================================
-- 2. Shared reference data (benchmarks)
-- =========================================================================

create table public.benchmarks (
  id bigserial primary key,
  name text not null,
  symbol text unique not null,
  description text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.benchmark_history (
  id bigserial primary key,
  benchmark_id bigint not null references public.benchmarks(id) on delete cascade,
  symbol text not null,
  price numeric not null,
  date date not null,
  created_at timestamptz default now(),
  unique(benchmark_id, date)
);
create index benchmark_history_benchmark_date_idx on public.benchmark_history(benchmark_id, date);

-- =========================================================================
-- 3. Row Level Security
-- =========================================================================

-- Per-user tables: users can only see/modify their own rows
alter table public.assets enable row level security;
alter table public.portfolio_history enable row level security;
alter table public.portfolio_snapshots enable row level security;
alter table public.asset_price_history enable row level security;
alter table public.asset_sectors enable row level security;
alter table public.transactions enable row level security;
alter table public.goals enable row level security;
alter table public.dividend_payments enable row level security;
alter table public.price_alerts enable row level security;
alter table public.retirement_scenarios enable row level security;
alter table public.box3_snapshots enable row level security;

-- Helper: generic "own rows only" policy for each per-user table
create policy "own rows select" on public.assets for select using (auth.uid() = user_id);
create policy "own rows insert" on public.assets for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.assets for update using (auth.uid() = user_id);
create policy "own rows delete" on public.assets for delete using (auth.uid() = user_id);

create policy "own rows select" on public.portfolio_history for select using (auth.uid() = user_id);
create policy "own rows insert" on public.portfolio_history for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.portfolio_history for update using (auth.uid() = user_id);
create policy "own rows delete" on public.portfolio_history for delete using (auth.uid() = user_id);

create policy "own rows select" on public.portfolio_snapshots for select using (auth.uid() = user_id);
create policy "own rows insert" on public.portfolio_snapshots for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.portfolio_snapshots for update using (auth.uid() = user_id);
create policy "own rows delete" on public.portfolio_snapshots for delete using (auth.uid() = user_id);

create policy "own rows select" on public.asset_price_history for select using (auth.uid() = user_id);
create policy "own rows insert" on public.asset_price_history for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.asset_price_history for update using (auth.uid() = user_id);
create policy "own rows delete" on public.asset_price_history for delete using (auth.uid() = user_id);

-- asset_sectors is joined via asset_id; restrict by the owning asset's user
create policy "via asset select" on public.asset_sectors for select
  using (exists (select 1 from public.assets a where a.id = asset_sectors.asset_id and a.user_id = auth.uid()));
create policy "via asset insert" on public.asset_sectors for insert
  with check (exists (select 1 from public.assets a where a.id = asset_sectors.asset_id and a.user_id = auth.uid()));
create policy "via asset update" on public.asset_sectors for update
  using (exists (select 1 from public.assets a where a.id = asset_sectors.asset_id and a.user_id = auth.uid()));
create policy "via asset delete" on public.asset_sectors for delete
  using (exists (select 1 from public.assets a where a.id = asset_sectors.asset_id and a.user_id = auth.uid()));

create policy "own rows select" on public.transactions for select using (auth.uid() = user_id);
create policy "own rows insert" on public.transactions for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.transactions for update using (auth.uid() = user_id);
create policy "own rows delete" on public.transactions for delete using (auth.uid() = user_id);

create policy "own rows select" on public.goals for select using (auth.uid() = user_id);
create policy "own rows insert" on public.goals for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.goals for update using (auth.uid() = user_id);
create policy "own rows delete" on public.goals for delete using (auth.uid() = user_id);

create policy "own rows select" on public.dividend_payments for select using (auth.uid() = user_id);
create policy "own rows insert" on public.dividend_payments for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.dividend_payments for update using (auth.uid() = user_id);
create policy "own rows delete" on public.dividend_payments for delete using (auth.uid() = user_id);

create policy "own rows select" on public.price_alerts for select using (auth.uid() = user_id);
create policy "own rows insert" on public.price_alerts for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.price_alerts for update using (auth.uid() = user_id);
create policy "own rows delete" on public.price_alerts for delete using (auth.uid() = user_id);

create policy "own rows select" on public.retirement_scenarios for select using (auth.uid() = user_id);
create policy "own rows insert" on public.retirement_scenarios for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.retirement_scenarios for update using (auth.uid() = user_id);
create policy "own rows delete" on public.retirement_scenarios for delete using (auth.uid() = user_id);

create policy "own rows select" on public.box3_snapshots for select using (auth.uid() = user_id);
create policy "own rows insert" on public.box3_snapshots for insert with check (auth.uid() = user_id);
create policy "own rows update" on public.box3_snapshots for update using (auth.uid() = user_id);
create policy "own rows delete" on public.box3_snapshots for delete using (auth.uid() = user_id);

-- Shared reference data: any authenticated user can read; writes via service_role only
alter table public.benchmarks enable row level security;
alter table public.benchmark_history enable row level security;

create policy "authenticated read" on public.benchmarks for select to authenticated using (true);
create policy "authenticated read" on public.benchmark_history for select to authenticated using (true);
-- (No insert/update/delete policies → only service_role can write)
