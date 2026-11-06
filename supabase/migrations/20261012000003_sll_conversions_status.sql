alter table public.sll_conversions add column if not exists status text not null default 'paid';

create unique index if not exists uq_sll_conversions_store_order
  on public.sll_conversions (store_id, order_id)
  where order_id is not null;

drop function if exists public.record_sll_conversion(uuid, text, text, numeric, text, text);

create or replace function public.record_sll_conversion(
  p_store_id uuid,
  p_token text,
  p_order_id text,
  p_total numeric,
  p_module text,
  p_source_id text,
  p_status text default 'paid'
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_valid boolean;
begin
  select exists(
    select 1 from public.stores
    where id = p_store_id
      and security_token = p_token
      and security_token is not null
  ) into v_valid;

  if not v_valid then
    raise exception 'invalid store token';
  end if;

  insert into public.sll_conversions (store_id, order_id, total, module, source_id, status)
  values (p_store_id, p_order_id, p_total, p_module, p_source_id, coalesce(p_status, 'paid'))
  on conflict (store_id, order_id) where order_id is not null
  do update set
    status = case when excluded.status = 'paid' then 'paid' else public.sll_conversions.status end,
    total = coalesce(excluded.total, public.sll_conversions.total);
end;
$$;

grant execute on function public.record_sll_conversion(uuid, text, text, numeric, text, text, text) to anon, authenticated;