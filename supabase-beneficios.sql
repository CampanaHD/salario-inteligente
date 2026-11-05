-- Execute depois de supabase-contas.sql. Benefícios (VR, VA, VT) como contas especiais.
alter table public.accounts drop constraint if exists accounts_kind_check;
alter table public.accounts add constraint accounts_kind_check check (kind in ('corrente','poupanca','carteira','investimento','beneficio'));
alter table public.accounts add column if not exists benefit_type text check (benefit_type in ('VR','VA','VT'));
alter table public.accounts add column if not exists monthly_amount numeric(14,2) not null default 0;
alter table public.accounts add column if not exists credit_day int check (credit_day between 1 and 31);
