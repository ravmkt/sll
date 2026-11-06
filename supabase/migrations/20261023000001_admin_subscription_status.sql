drop function if exists public.admin_set_store_subscription(uuid, text);

create or replace function public.admin_set_subscription_status(p_subscription_id uuid, p_status text)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
  v_store uuid;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;
  if p_status not in ('active', 'canceled', 'lifetime') then
    raise exception 'invalid status';
  end if;

  update public.subscriptions
     set status = p_status
   where id = p_subscription_id
  returning store_id into v_store;
  get diagnostics n = row_count;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), 'subscription_status_changed',
          jsonb_build_object('store_id', v_store, 'subscription_id', p_subscription_id, 'status', p_status));

  return n;
end;
$$;

revoke all on function public.admin_set_subscription_status(uuid, text) from public, anon;
grant execute on function public.admin_set_subscription_status(uuid, text) to authenticated;