-- Permite o tipo 'transfer' em lançamentos (usado no histórico do pagamento de fatura do cartão).
-- Pode ser executado mais de uma vez com segurança.
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.transactions'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%kind%income%'
  loop
    execute format('alter table public.transactions drop constraint %I', c);
  end loop;
  alter table public.transactions add constraint transactions_kind_check check (kind in ('income','expense','transfer'));
end $$;
