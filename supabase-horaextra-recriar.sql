-- ATENÇÃO: apaga e recria as tabelas da hora extra. Use somente se elas estiverem vazias
-- (confira no Table Editor) ou se você aceita perder o que há nelas. Resolve tabelas antigas com colunas erradas.
drop table if exists public.overtime_entries cascade;
drop table if exists public.overtime_settings cascade;

create table public.overtime_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  work_date date not null,
  start_time time not null,
  lunch_out time,
  lunch_in time,
  end_time time not null,
  other_break_min int not null default 0,
  day_kind text not null default 'auto' check (day_kind in ('auto','weekday','saturday','sunday')),
  note text,
  created_at timestamptz not null default now()
);
create table public.overtime_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  daily_hours numeric(4,2) not null default 8,
  saturday_hours numeric(4,2) not null default 0,
  hourly_rate numeric(10,2),
  extra_pct numeric(5,2) not null default 50,
  sunday_pct numeric(5,2) not null default 100,
  include_dsr boolean not null default false
);
alter table public.overtime_entries enable row level security;
alter table public.overtime_settings enable row level security;
create policy "overtime_entries_own" on public.overtime_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "overtime_settings_own" on public.overtime_settings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index overtime_entries_date_idx on public.overtime_entries(user_id, work_date desc);
grant select, insert, update, delete on public.overtime_entries, public.overtime_settings to authenticated;
notify pgrst, 'reload schema';
