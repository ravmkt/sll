do $$
begin
  if to_regprocedure('public._admin_master_store_full_base(uuid)') is null then
    alter function public.admin_master_store_full(uuid) rename to _admin_master_store_full_base;
  end if;
end $$;
revoke all on function public._admin_master_store_full_base(uuid) from public, anon, authenticated;

create or replace function public.admin_master_store_full(p_store_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v jsonb;
  k text;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  v := public._admin_master_store_full_base(p_store_id)::jsonb;

  select case
           when bool_or(s.status = 'lifetime') then 'lifetime'
           when bool_or(s.status in ('active', 'past_due')) then 'paid'
         end
    into k
    from public.subscriptions s
   where s.store_id::text = p_store_id::text and s.is_current;

  if k is not null then
    v := jsonb_set(v, '{store}',
          (v -> 'store') || jsonb_build_object('trial_ends_at', null, 'plan_kind', k));
  end if;
  return v;
end;
$$;
revoke all on function public.admin_master_store_full(uuid) from public, anon;
grant execute on function public.admin_master_store_full(uuid) to authenticated;