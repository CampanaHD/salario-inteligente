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
