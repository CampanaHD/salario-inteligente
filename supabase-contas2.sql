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
