create or replace function public.trg_block_plan_delete_with_subs()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from public.subscriptions s where s.dynamic_plan_id = old.id) then
    raise exception 'PLANO_COM_ASSINANTES: este plano tem assinaturas. Use Pausar em vez de excluir.';
  end if;
  return old;
end $$;

drop trigger if exists block_plan_delete_with_subs on public.dynamic_plans;
create trigger block_plan_delete_with_subs
  before delete on public.dynamic_plans
  for each row execute function public.trg_block_plan_delete_with_subs();

select tgname from pg_trigger where tgname = 'block_plan_delete_with_subs' and not tgisinternal;