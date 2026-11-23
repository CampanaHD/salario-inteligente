-- Salário Inteligente: campos extras para empréstimos e renegociações
-- Execute uma vez no Supabase SQL Editor.
alter table public.recurring_bills
  add column if not exists creditor_name text,
  add column if not exists interest_rate numeric(8,4) not null default 0,
  add column if not exists principal_amount numeric(12,2);

alter table public.recurring_bills drop constraint if exists recurring_bills_bill_type_check;
alter table public.recurring_bills add constraint recurring_bills_bill_type_check
  check (bill_type in ('bill','installment','financing','loan','property_tax'));
