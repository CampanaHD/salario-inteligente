-- Execute no SQL Editor do Supabase (uma vez). Manutenções e despesas de veículos.
create table if not exists public.vehicle_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  kind text not null default 'manutencao' check (kind in ('manutencao','despesa')),
  category text not null default 'Outros',
  description text,
  expense_date date not null default current_date,
  odometer numeric(12,1),
  amount numeric(12,2) not null check (amount >= 0),
  provider text,
  next_due_km numeric(12,1),
  next_due_date date,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.vehicle_expenses enable row level security;
drop policy if exists "vehicle_expenses_own" on public.vehicle_expenses;
create policy "vehicle_expenses_own" on public.vehicle_expenses for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists vehicle_expenses_vehicle_idx on public.vehicle_expenses(vehicle_id, expense_date desc);
