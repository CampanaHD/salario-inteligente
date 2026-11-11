-- Salário Inteligente: integração de investimentos com contas e lançamentos
-- Execute uma vez no SQL Editor do Supabase.
alter table public.investments
  add column if not exists account_id uuid references public.accounts(id) on delete set null;
create index if not exists investments_account_idx on public.investments(account_id);
-- Garante que a aplicação vinculada seja identificável no histórico.
create index if not exists transactions_investment_note_idx
  on public.transactions(user_id)
  where notes like '%[investimento_id:%';
