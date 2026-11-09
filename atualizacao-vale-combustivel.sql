-- Salário Inteligente: habilitar o benefício Vale Combustível (VC)
-- Execute uma única vez no SQL Editor do Supabase.
alter table public.accounts
  drop constraint if exists accounts_benefit_type_check;

alter table public.accounts
  add constraint accounts_benefit_type_check
  check (benefit_type is null or benefit_type in ('VR','VA','VT','VC'));
