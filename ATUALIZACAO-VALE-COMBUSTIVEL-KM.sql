-- Execute no SQL Editor do Supabase.
-- 1) Libera o tipo de benefício Vale combustível.
alter table public.accounts drop constraint if exists accounts_benefit_type_check;
alter table public.accounts add constraint accounts_benefit_type_check
  check (benefit_type is null or benefit_type in ('VR','VA','VT','VC'));

-- 2) Armazena a quilometragem da manhã e da noite por veículo/dia.
create table if not exists public.vehicle_daily_km (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  log_date date not null default current_date,
  morning_odometer numeric(12,1) not null check (morning_odometer >= 0),
  evening_odometer numeric(12,1) not null check (evening_odometer >= morning_odometer),
  km_driven numeric(12,1) generated always as (evening_odometer - morning_odometer) stored,
  notes text,
  created_at timestamptz not null default now(),
  unique (user_id, vehicle_id, log_date)
);
alter table public.vehicle_daily_km enable row level security;
drop policy if exists "vehicle_daily_km_own" on public.vehicle_daily_km;
create policy "vehicle_daily_km_own" on public.vehicle_daily_km for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists vehicle_daily_km_vehicle_date_idx
  on public.vehicle_daily_km(vehicle_id, log_date desc);
