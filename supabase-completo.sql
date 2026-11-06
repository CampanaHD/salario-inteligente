-- SALÁRIO INTELIGENTE PLUS — banco de dados completo.
-- Execute o conteúdo inteiro no SQL Editor do Supabase (depois do supabase.sql original). Pode rodar de novo com segurança.

-- ===== supabase-veiculos =====
-- Execute no SQL Editor do Supabase (uma vez). Manutenções e despesas de veículos.
create table if not exists public.vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  kind text not null default 'manutencao' check (kind in ('manutencao','despesa')),
  category text not null default 'Outros',
  description text,
  expense_date date not null default current_date,
  odometer numeric(12,1),
  amount numeric(12,2) not null check (amount >= 0),
  provider text,
  next_due_km numeric(12,1),
  next_due_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.vehicle_expenses enable row level security;
drop policy if exists "vehicle_expenses_own" on public.vehicle_expenses;
create policy "vehicle_expenses_own" on public.vehicle_expenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists vehicle_expenses_vehicle_idx on public.vehicle_expenses(vehicle_id, expense_date desc);

-- ===== supabase-veiculos2 =====
-- Execute uma vez: tipo do veículo (carro, moto ou outro).
alter table public.vehicles add column if not exists vehicle_type text not null default 'carro' check (vehicle_type in ('carro','moto','outro'));

-- ===== supabase-contas =====
-- Execute uma vez no SQL Editor do Supabase. Contas bancárias + vínculo nos lançamentos.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  bank text,
  kind text not null default 'corrente' check (kind in ('corrente','poupanca','carteira','investimento')),
  initial_balance numeric(14,2) not null default 0,
  color text not null default '#087f72',
  is_default boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.accounts enable row level security;
drop policy if exists "accounts_own" on public.accounts;
create policy "accounts_own" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.transactions add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.transactions add column if not exists payment_method text;
create index if not exists transactions_account_idx on public.transactions(account_id);

-- ===== supabase-contas2 =====
-- Execute depois de supabase-contas.sql. Transferências entre contas, pagamento de fatura e cartão no lançamento.
create table if not exists public.account_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'transfer' check (kind in ('transfer','invoice')),
  from_account uuid not null references public.accounts(id) on delete cascade,
  to_account uuid references public.accounts(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  transfer_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);
alter table public.account_transfers enable row level security;
drop policy if exists "account_transfers_own" on public.account_transfers;
create policy "account_transfers_own" on public.account_transfers for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
alter table public.transactions add column if not exists card_id uuid references public.credit_cards(id) on delete set null;

-- ===== supabase-beneficios =====
-- Execute depois de supabase-contas.sql. Benefícios (VR, VA, VT) como contas especiais.
alter table public.accounts drop constraint if exists accounts_kind_check;
alter table public.accounts add constraint accounts_kind_check check (kind in ('corrente','poupanca','carteira','investimento','beneficio'));
alter table public.accounts add column if not exists benefit_type text check (benefit_type in ('VR','VA','VT'));
alter table public.accounts add column if not exists monthly_amount numeric(14,2) not null default 0;
alter table public.accounts add column if not exists credit_day int check (credit_day between 1 and 31);

-- ===== supabase-horaextra =====
-- Execute uma vez no SQL Editor do Supabase. Hora extra: registros de ponto e configurações.
create table if not exists public.overtime_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  lunch_out time,
  lunch_in time,
  end_time time not null,
  other_break_min int not null default 0,
  day_kind text not null default 'auto' check (day_kind in ('auto','weekday','saturday','sunday')),
  note text,
  created_at timestamptz not null default now()
);
create table if not exists public.overtime_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_hours numeric(4,2) not null default 8,
  saturday_hours numeric(4,2) not null default 0,
  hourly_rate numeric(10,2),
  extra_pct numeric(5,2) not null default 50,
  sunday_pct numeric(5,2) not null default 100,
  include_dsr boolean not null default false
);
alter table public.overtime_entries enable row level security;
alter table public.overtime_settings enable row level security;
drop policy if exists "overtime_entries_own" on public.overtime_entries;
create policy "overtime_entries_own" on public.overtime_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "overtime_settings_own" on public.overtime_settings;
create policy "overtime_settings_own" on public.overtime_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists overtime_entries_date_idx on public.overtime_entries(user_id, work_date desc);

-- ===== Reparo (pode rodar de novo com segurança): completa colunas se a tabela já existia com outro formato =====
alter table public.overtime_settings add column if not exists daily_hours numeric(4,2) not null default 8;
alter table public.overtime_settings add column if not exists saturday_hours numeric(4,2) not null default 0;
alter table public.overtime_settings add column if not exists hourly_rate numeric(10,2);
alter table public.overtime_settings add column if not exists extra_pct numeric(5,2) not null default 50;
alter table public.overtime_settings add column if not exists sunday_pct numeric(5,2) not null default 100;
alter table public.overtime_settings add column if not exists include_dsr boolean not null default false;
create unique index if not exists overtime_settings_user_uidx on public.overtime_settings(user_id);
alter table public.overtime_entries add column if not exists work_date date;
alter table public.overtime_entries add column if not exists start_time time;
alter table public.overtime_entries add column if not exists lunch_out time;
alter table public.overtime_entries add column if not exists lunch_in time;
alter table public.overtime_entries add column if not exists end_time time;
alter table public.overtime_entries add column if not exists other_break_min int not null default 0;
alter table public.overtime_entries add column if not exists day_kind text not null default 'auto';
alter table public.overtime_entries add column if not exists note text;
notify pgrst, 'reload schema';

-- ===== crédito automático dos benefícios =====
alter table public.accounts add column if not exists auto_credit boolean not null default false;
notify pgrst, 'reload schema';
