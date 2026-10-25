-- Salário Inteligente — esquema inicial Supabase
-- Execute no SQL Editor do projeto Supabase.
-- Configure Auth > URL Configuration e confirme o e-mail conforme sua política.
-- IMPORTANTE: nunca coloque service_role key no frontend.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  salary_amount numeric(12,2) not null default 0 check (salary_amount >= 0),
  salary_day20_amount numeric(12,2) not null default 800 check (salary_day20_amount >= 0),
  current_balance numeric(12,2) not null default 0,
  payday integer not null default 30 check (payday between 1 and 31),
  reserve_amount numeric(12,2) not null default 0 check (reserve_amount >= 0),
  plan text not null default 'free' check (plan in ('free','individual','family')),
  family_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Migração segura para usuários que já tinham o perfil criado.
alter table public.profiles add column if not exists salary_day20_amount numeric(12,2) not null default 800 check (salary_day20_amount >= 0);
alter table public.profiles add column if not exists receives_salary_day20 boolean not null default false;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  category text not null default 'Outros',
  amount numeric(12,2) not null check (amount > 0),
  transaction_date date not null default current_date,
  kind text not null check (kind in ('income','expense')),
  is_paid boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.recurring_bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'Outros',
  amount numeric(12,2) not null check (amount > 0),
  due_date date not null,
  frequency text not null default 'monthly' check (frequency in ('monthly','weekly','once')),
  bill_type text not null default 'bill' check (bill_type in ('bill','installment')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(12,2) not null check (target_amount > 0),
  saved_amount numeric(12,2) not null default 0 check (saved_amount >= 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  family_owner_id uuid not null references auth.users(id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'accepted' check (status in ('pending','accepted','revoked')),
  created_at timestamptz not null default now(),
  unique(family_owner_id, member_id),
  check (family_owner_id <> member_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  notification_type text not null default 'reminder',
  scheduled_for timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Registro de assinatura para integração futura com um gateway.
-- Não permita que usuários definam seu próprio status pago pelo cliente.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','individual','family')),
  status text not null default 'inactive' check (status in ('trialing','active','past_due','canceled','inactive')),
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx on public.transactions(user_id, transaction_date desc);
create index if not exists bills_user_due_idx on public.recurring_bills(user_id, due_date);
create index if not exists goals_user_idx on public.goals(user_id);
create index if not exists notifications_user_scheduled_idx on public.notifications(user_id, scheduled_for);

-- Trigger para criar o perfil após o cadastro do Auth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''))
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'inactive')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- updated_at automático
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

do $$ declare t text; begin
  foreach t in array array['profiles','transactions','recurring_bills','goals','subscriptions'] loop
    execute format('drop trigger if exists set_updated_at on public.%I',t);
    execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
  end loop;
end $$;

-- RLS habilitado em todas as tabelas.
alter table public.profiles enable row level security;
alter table public.transactions enable row level security;
alter table public.recurring_bills enable row level security;
alter table public.goals enable row level security;
alter table public.family_members enable row level security;
alter table public.notifications enable row level security;
alter table public.subscriptions enable row level security;

-- Perfil: usuário vê e edita o próprio perfil. Para consultar dados de outros membros,
-- a versão inicial só expõe perfil básico quando há associação familiar aceita.
drop policy if exists "profile select own or family" on public.profiles;
create policy "profile select own or family" on public.profiles for select to authenticated
using (
  id = auth.uid()
  or exists(select 1 from public.family_members fm where fm.status='accepted'
    and ((fm.member_id=auth.uid() and fm.family_owner_id=profiles.id)
      or (fm.family_owner_id=auth.uid() and fm.member_id=profiles.id)))
);
drop policy if exists "profile insert own" on public.profiles;
create policy "profile insert own" on public.profiles for insert to authenticated with check (id=auth.uid());
drop policy if exists "profile update own" on public.profiles;
create policy "profile update own" on public.profiles for update to authenticated using (id=auth.uid()) with check (id=auth.uid());

-- Dados financeiros privados por padrão.
drop policy if exists "transactions own all" on public.transactions;
create policy "transactions own all" on public.transactions for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "bills own all" on public.recurring_bills;
create policy "bills own all" on public.recurring_bills for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "goals own all" on public.goals;
create policy "goals own all" on public.goals for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- Entrada no grupo por código sem expor publicamente os perfis por busca direta.
create or replace function public.join_family_by_code(p_code text)
returns void language plpgsql security definer set search_path = public
as $$
declare owner_id uuid;
begin
  if auth.uid() is null then raise exception 'É necessário estar autenticado.'; end if;
  select id into owner_id from public.profiles where family_code = upper(trim(p_code));
  if owner_id is null then raise exception 'Código de grupo não encontrado.'; end if;
  if owner_id = auth.uid() then raise exception 'Este é seu próprio grupo.'; end if;
  insert into public.family_members(family_owner_id, member_id, status)
  values(owner_id, auth.uid(), 'accepted')
  on conflict(family_owner_id, member_id) do update set status='accepted';
end;
$$;
grant execute on function public.join_family_by_code(text) to authenticated;

-- Participante pode ver vínculos em que participa e iniciar convite como membro.
drop policy if exists "family select participants" on public.family_members;
create policy "family select participants" on public.family_members for select to authenticated
using (family_owner_id=auth.uid() or member_id=auth.uid());
drop policy if exists "family join as member" on public.family_members;
create policy "family join as member" on public.family_members for insert to authenticated
with check (member_id=auth.uid() and status='accepted');
drop policy if exists "family owner manage" on public.family_members;
create policy "family owner manage" on public.family_members for update to authenticated
using (family_owner_id=auth.uid()) with check (family_owner_id=auth.uid());
drop policy if exists "family owner or member delete" on public.family_members;
create policy "family owner or member delete" on public.family_members for delete to authenticated
using (family_owner_id=auth.uid() or member_id=auth.uid());

drop policy if exists "notifications own all" on public.notifications;
create policy "notifications own all" on public.notifications for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());

-- O cliente pode ler seu plano, mas não pode editar assinaturas. Atualize via backend/webhook
-- com service_role guardada apenas no servidor.
drop policy if exists "subscription select own" on public.subscriptions;
create policy "subscription select own" on public.subscriptions for select to authenticated using (user_id=auth.uid());

-- Grants padrão para usuários autenticados (RLS continua controlando as linhas).
grant select, insert, update, delete on public.transactions to authenticated;
grant select, insert, update, delete on public.recurring_bills to authenticated;
grant select, insert, update, delete on public.goals to authenticated;
grant select, insert, update, delete on public.family_members to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.subscriptions to authenticated;

-- Atualização 2.0: cartões e compras parceladas
create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  last_four text,
  limit_amount numeric(12,2) not null default 0 check (limit_amount >= 0),
  closing_day integer not null default 5 check (closing_day between 1 and 31),
  due_day integer not null default 12 check (due_day between 1 and 31),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.card_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid references public.credit_cards(id) on delete set null,
  description text not null,
  category text not null default 'Outros',
  total_amount numeric(12,2) not null check (total_amount > 0),
  installments_total integer not null check (installments_total between 1 and 60),
  installments_paid integer not null default 0 check (installments_paid between 0 and 60),
  installment_amount numeric(12,2) not null check (installment_amount > 0),
  purchase_date date not null default current_date,
  status text not null default 'active' check (status in ('active','completed','cancelled')),
  created_at timestamptz not null default now()
);
create index if not exists credit_cards_user_idx on public.credit_cards(user_id, created_at desc);
create index if not exists card_purchases_user_date_idx on public.card_purchases(user_id, purchase_date desc);
alter table public.credit_cards enable row level security;
alter table public.card_purchases enable row level security;
drop policy if exists "credit cards own all" on public.credit_cards;
create policy "credit cards own all" on public.credit_cards for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "card purchases own all" on public.card_purchases;
create policy "card purchases own all" on public.card_purchases for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.credit_cards to authenticated;
grant select, insert, update, delete on public.card_purchases to authenticated;


-- Atualização 3.0: bandeiras/taxas dos cartões e controle de veículos/abastecimento
alter table public.credit_cards add column if not exists brand text not null default 'Visa';
alter table public.credit_cards add column if not exists issuer text;
alter table public.credit_cards add column if not exists monthly_interest_rate numeric(7,4) not null default 0 check (monthly_interest_rate >= 0);

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  model text,
  plate text,
  fuel_type text not null default 'Flex',
  tank_capacity numeric(8,2),
  initial_odometer numeric(12,1) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists public.fuel_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  fuel_date date not null default current_date,
  odometer numeric(12,1) not null check (odometer >= 0),
  liters numeric(10,3) not null check (liters > 0),
  price_per_liter numeric(10,3) not null check (price_per_liter >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  fuel_name text not null default 'Gasolina',
  station text,
  full_tank boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists vehicles_user_idx on public.vehicles(user_id, created_at desc);
alter table public.fuel_records add column if not exists payment_method text not null default 'Outro';

create index if not exists fuel_records_user_date_idx on public.fuel_records(user_id, fuel_date desc);
create index if not exists fuel_records_vehicle_odo_idx on public.fuel_records(vehicle_id, odometer desc);
alter table public.vehicles enable row level security;
alter table public.fuel_records enable row level security;
drop policy if exists "vehicles own all" on public.vehicles;
create policy "vehicles own all" on public.vehicles for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists "fuel records own all" on public.fuel_records;
create policy "fuel records own all" on public.fuel_records for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select, insert, update, delete on public.vehicles to authenticated;
grant select, insert, update, delete on public.fuel_records to authenticated;

-- Atualização V4.4: limites mensais de orçamento por categoria (salvos por usuário)
alter table public.profiles
  add column if not exists category_budgets jsonb not null default '{}'::jsonb;

-- Atualização Família 1.0: livro financeiro compartilhado, separado dos dados pessoais.
create table if not exists public.family_transactions (
  id uuid primary key default gen_random_uuid(),
  family_owner_id uuid not null references auth.users(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 120),
  category text not null default 'Outros',
  amount numeric(12,2) not null check (amount > 0),
  transaction_date date not null default current_date,
  kind text not null check (kind in ('income','expense')),
  notes text,
  created_at timestamptz not null default now()
);

alter table public.family_transactions enable row level security;
drop policy if exists "family transactions select group" on public.family_transactions;
create policy "family transactions select group" on public.family_transactions
for select to authenticated using (
  family_owner_id = auth.uid()
  or exists (
    select 1 from public.family_members fm
    where fm.family_owner_id = family_transactions.family_owner_id
      and fm.member_id = auth.uid() and fm.status = 'accepted'
  )
);
drop policy if exists "family transactions insert group" on public.family_transactions;
create policy "family transactions insert group" on public.family_transactions
for insert to authenticated with check (
  created_by = auth.uid()
  and (
    family_owner_id = auth.uid()
    or exists (
      select 1 from public.family_members fm
      where fm.family_owner_id = family_transactions.family_owner_id
        and fm.member_id = auth.uid() and fm.status = 'accepted'
    )
  )
);
drop policy if exists "family transactions delete own" on public.family_transactions;
create policy "family transactions delete own" on public.family_transactions
for delete to authenticated using (
  created_by = auth.uid()
  and (
    family_owner_id = auth.uid()
    or exists (
      select 1 from public.family_members fm
      where fm.family_owner_id = family_transactions.family_owner_id
        and fm.member_id = auth.uid() and fm.status = 'accepted'
    )
  )
);
grant select, insert, delete on public.family_transactions to authenticated;


-- Salário Inteligente V4.9: carteira de investimentos
create table if not exists public.investments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 120),
  investment_type text not null default 'Outro',
  amount numeric(14,2) not null check (amount > 0),
  investment_date date not null default current_date,
  institution text,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.investments enable row level security;
drop policy if exists "investments own all" on public.investments;
create policy "investments own all" on public.investments for all to authenticated using (user_id=auth.uid()) with check (user_id=auth.uid());
grant select, insert, update, delete on public.investments to authenticated;
