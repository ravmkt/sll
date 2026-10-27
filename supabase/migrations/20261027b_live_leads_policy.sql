create index if not exists live_leads_created_idx on live_commerce.live_leads (store_id, created_at desc);

grant usage on schema live_commerce to authenticated;
grant select on live_commerce.live_leads to authenticated;

drop policy if exists live_leads_select_owner on live_commerce.live_leads;
do $$
begin
  if to_regprocedure('live_commerce.is_store_owner(uuid)') is not null then
    execute 'create policy live_leads_select_owner on live_commerce.live_leads for select to authenticated using (live_commerce.is_store_owner(store_id))';
    raise notice 'Policy criada com live_commerce.is_store_owner.';
  else
    raise notice 'ATENCAO: live_commerce.is_store_owner(uuid) nao existe. Policy NAO criada.';
  end if;
end $$;

notify pgrst, 'reload schema';

select policyname, cmd from pg_policies where schemaname = 'live_commerce' and tablename = 'live_leads';