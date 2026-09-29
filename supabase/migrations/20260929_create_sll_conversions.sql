create table if not exists public.sll_conversions (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id text,
  total numeric,
  module text,
  source_id text,
  created_at timestamptz not null default now()
);

alter table public.sll_conversions enable row level security;

drop policy if exists "service_role_full_access" on public.sll_conversions;
create policy "service_role_full_access" on public.sll_conversions
  for all using (auth.role() = 'service_role');

create or replace function public.record_sll_conversion(
  p_store_id uuid,
  p_token text,
  p_order_id text,
  p_total numeric,
  p_module text,
  p_source_id text
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

  insert into public.sll_conversions (store_id, order_id, total, module, source_id)
  values (p_store_id, p_order_id, p_total, p_module, p_source_id);
end;
$$;

grant execute on function public.record_sll_conversion to anon, authenticated;
