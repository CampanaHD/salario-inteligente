-- Salário Inteligente: financiamento de imóveis/IPTU e controle de vencimento/atraso
-- Execute uma vez no SQL Editor do Supabase.

alter table public.transactions
  add column if not exists due_date date,
  add column if not exists late_fee numeric(12,2) not null default 0,
  add column if not exists late_interest numeric(12,2) not null default 0;

alter table public.recurring_bills
  add column if not exists property_address text,
  add column if not exists contract_total numeric(12,2),
  add column if not exists installments_total integer,
  add column if not exists installments_paid integer not null default 0;

alter table public.recurring_bills drop constraint if exists recurring_bills_bill_type_check;
alter table public.recurring_bills add constraint recurring_bills_bill_type_check
  check (bill_type in ('bill','installment','financing','property_tax'));

alter table public.recurring_bills drop constraint if exists recurring_bills_frequency_check;
alter table public.recurring_bills add constraint recurring_bills_frequency_check
  check (frequency in ('monthly','weekly','once','yearly'));
