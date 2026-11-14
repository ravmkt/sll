create or replace function tryon.consume_credit(p_store_id uuid, p_cost numeric default 0)
returns boolean
language plpgsql
security definer
set search_path = public, tryon
as $$
declare
  v_allowed boolean;
begin
  v_allowed := coalesce((tryon.reserve_generation(p_store_id, null)->>'allowed')::boolean, false);
  if v_allowed and coalesce(p_cost, 0) > 0 then
    perform tryon.add_cost(p_store_id, p_cost);
  end if;
  return v_allowed;
end;
$$;

revoke all on function tryon.consume_credit(uuid, numeric) from public, anon, authenticated;
grant execute on function tryon.consume_credit(uuid, numeric) to service_role;
