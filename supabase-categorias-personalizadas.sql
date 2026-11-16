-- Salário Inteligente: categorias personalizadas, subcategorias e forma de pagamento
-- Execute uma única vez no SQL Editor do Supabase.
alter table public.profiles
  add column if not exists custom_categories jsonb not null
  default '{"enabled":["Alimentação","Moradia","Transporte","Saúde","Lazer","Educação","Salário","Contas","Veículos","Cartão de Crédito","Terceiros","Pessoal","Pets","Assinaturas","Compras","Viagens","Impostos","Presentes","Outros"],"custom":[]}'::jsonb;

alter table public.transactions
  add column if not exists subcategory text,
  add column if not exists payment_method text;

alter table public.fuel_records
  add column if not exists payment_method text not null default 'Outro';

-- Recupera a forma de pagamento dos lançamentos de abastecimentos já existentes.
update public.transactions
set payment_method = substring(notes from 'pagamento:([^;]+)')
where payment_method is null
  and notes like '%fuel_record_id:%'
  and notes like '%pagamento:%';

comment on column public.profiles.custom_categories is
  'Preferências individuais de categorias: enabled (nomes ativos) e custom (categorias/subcategorias personalizadas).';
comment on column public.transactions.subcategory is
  'Subcategoria opcional do lançamento financeiro.';
comment on column public.transactions.payment_method is
  'Forma de pagamento do lançamento financeiro.';
