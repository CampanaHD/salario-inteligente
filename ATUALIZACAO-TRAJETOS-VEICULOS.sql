-- Diário de deslocamentos: vários trechos por veículo e por dia.
-- Execute no Supabase SQL Editor.
create table if not exists public.vehicle_trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  trip_date date not null default current_date,
  origin text,
  destination text,
  departure_time time,
  arrival_time time,
  start_odometer numeric(12,1) check (start_odometer is null or start_odometer >= 0),
  end_odometer numeric(12,1) check (end_odometer is null or end_odometer >= 0),
  km_driven numeric(12,1) check (km_driven is null or km_driven >= 0),
  extra_cost numeric(12,2) not null default 0 check (extra_cost >= 0),
  notes text,
  created_at timestamptz not null default now(),
  constraint vehicle_trips_odometer_order check (start_odometer is null or end_odometer is null or end_odometer >= start_odometer)
);

-- Remove a restrição antiga que permitia somente um trajeto por dia.
drop index if exists public.vehicle_trips_user_vehicle_day_uidx;
create index if not exists vehicle_trips_vehicle_date_idx on public.vehicle_trips(vehicle_id, trip_date desc);
create index if not exists vehicle_trips_user_vehicle_date_idx on public.vehicle_trips(user_id, vehicle_id, trip_date desc);

alter table public.vehicle_trips enable row level security;
drop policy if exists "vehicle_trips_own" on public.vehicle_trips;
create policy "vehicle_trips_own" on public.vehicle_trips for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Locais favoritos/predefinidos, sincronizados na conta Supabase.
create table if not exists public.vehicle_locations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  constraint vehicle_locations_user_name_unique unique(user_id, name)
);
alter table public.vehicle_locations enable row level security;
drop policy if exists "vehicle_locations_own" on public.vehicle_locations;
create policy "vehicle_locations_own" on public.vehicle_locations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists vehicle_locations_user_idx on public.vehicle_locations(user_id);
