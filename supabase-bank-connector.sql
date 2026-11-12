-- Salário Inteligente: pareamento seguro do aplicativo Android.
-- Execute uma vez no SQL Editor do Supabase.

alter table public.transactions
  add column if not exists bank_source text,
  add column if not exists external_id text,
  add column if not exists transaction_source text;

drop index if exists public.transactions_user_external_id_uidx;
create unique index transactions_user_external_id_uidx
  on public.transactions(user_id, external_id);

create table if not exists public.bank_device_pairings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null default 'Android',
  bank_name text,
  pair_code_hash text unique,
  device_token_hash text unique,
  expires_at timestamptz,
  paired_at timestamptz,
  last_seen_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists bank_device_pairings_user_idx
  on public.bank_device_pairings(user_id, created_at desc);

alter table public.bank_device_pairings enable row level security;
drop policy if exists "Users can view own bank devices" on public.bank_device_pairings;
create policy "Users can view own bank devices"
  on public.bank_device_pairings for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Users can create own bank pairings" on public.bank_device_pairings;
create policy "Users can create own bank pairings"
  on public.bank_device_pairings for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "Users can revoke own bank devices" on public.bank_device_pairings;
create policy "Users can revoke own bank devices"
  on public.bank_device_pairings for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table public.bank_device_pairings is 'Dispositivos Android autorizados pelo próprio usuário para enviar movimentações bancárias identificadas em notificações.';
comment on column public.transactions.external_id is 'Identificador idempotente de uma movimentação importada pelo conector bancário.';
