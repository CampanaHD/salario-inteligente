-- ============================================================
-- Planos de assinatura (Gratuito / Premium / Completo)
-- Execute no SQL Editor do Supabase (pode rodar de novo com segurança).
-- Mapeamento da coluna plan:  free = Gratuito · individual = Premium · family = Completo
-- ============================================================

-- 1) Garante uma linha de assinatura para todos os usuários já cadastrados (começam no Gratuito)
insert into public.subscriptions (user_id, plan, status)
select id, 'free', 'inactive' from public.profiles
on conflict (user_id) do nothing;

-- 2) A fonte oficial do plano é a tabela subscriptions (o usuário só consegue LER).
--    Este gatilho impede que alguém altere profiles.plan pelo navegador.
create or replace function public.protect_profile_plan()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.plan is distinct from old.plan and coalesce(auth.role(), 'service_role') <> 'service_role' then
    new.plan := old.plan;
  end if;
  return new;
end;
$$;
drop trigger if exists trg_protect_profile_plan on public.profiles;
create trigger trg_protect_profile_plan before update on public.profiles
for each row execute function public.protect_profile_plan();

-- 3) Função útil para regras futuras no banco (RLS): plano efetivo do usuário logado
create or replace function public.current_plan()
returns text language sql stable security definer set search_path = public
as $$
  select coalesce((
    select plan from public.subscriptions
    where user_id = auth.uid()
      and status in ('active','trialing')
      and (current_period_end is null or current_period_end > now())
  ), 'free');
$$;
grant execute on function public.current_plan() to authenticated;

-- ------------------------------------------------------------
-- COMO LIBERAR UM PLANO MANUALMENTE (troque o e-mail e o plano)
-- plan: 'individual' = Premium · 'family' = Completo · 'free' = Gratuito
-- ------------------------------------------------------------
-- update public.subscriptions
--    set plan = 'family', status = 'active', provider = 'manual',
--        current_period_start = now(), current_period_end = now() + interval '30 days', updated_at = now()
--  where user_id = (select id from auth.users where email = 'seu@email.com');
--
-- Para liberar sem data de vencimento (ex.: sua própria conta), use current_period_end = null.
