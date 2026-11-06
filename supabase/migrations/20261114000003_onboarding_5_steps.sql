alter table public.stores add column if not exists store_email text;
alter table public.stores add column if not exists store_whatsapp text;
alter table public.stores add column if not exists manager_name text;
alter table public.stores add column if not exists manager_phone text;
alter table public.stores add column if not exists manager_email text;
alter table public.stores add column if not exists billing_data jsonb not null default '{}'::jsonb;

create or replace function public.save_onboarding_progress(
  p_store_id uuid, p_step integer, p_completed boolean, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  d jsonb := coalesce(p_data, '{}'::jsonb);
  b jsonb := d->'brand_settings';
  bd jsonb := d->'billing_data';
  m text := d->>'connection_method';
begin
  if not exists (select 1 from public.stores where id = p_store_id and owner_user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  if m is not null and m not in ('gtm','yampi','manual') then raise exception 'metodo de conexao invalido'; end if;
  if bd is not null and (jsonb_typeof(bd) <> 'object' or length(bd::text) > 4000) then raise exception 'dados de faturamento invalidos'; end if;
  if b is not null then
    if jsonb_typeof(b) <> 'object' or length(b::text) > 8000 then raise exception 'brand_settings invalido'; end if;
    if (b ? 'primary_color' and (b->>'primary_color') !~ '^#[0-9a-fA-F]{6}$')
       or (b ? 'secondary_color' and (b->>'secondary_color') !~ '^#[0-9a-fA-F]{6}$') then
      raise exception 'cor invalida';
    end if;
    if b ? 'benefits' and (jsonb_typeof(b->'benefits') <> 'array' or jsonb_array_length(b->'benefits') > 8) then
      raise exception 'beneficios invalidos';
    end if;
  end if;
  update public.stores set
    onboarding_step = greatest(1, least(coalesce(p_step, 1), 5)),
    onboarding_completed = onboarding_completed or coalesce(p_completed, false),
    store_url = case when d ? 'store_url' then nullif(left(trim(d->>'store_url'), 300), '') else store_url end,
    store_niche = case when d ? 'store_niche' then nullif(left(trim(d->>'store_niche'), 80), '') else store_niche end,
    store_email = case when d ? 'store_email' then nullif(left(trim(d->>'store_email'), 200), '') else store_email end,
    store_whatsapp = case when d ? 'store_whatsapp' then nullif(left(regexp_replace(coalesce(d->>'store_whatsapp',''), '\D', '', 'g'), 13), '') else store_whatsapp end,
    manager_name = case when d ? 'manager_name' then nullif(left(trim(d->>'manager_name'), 120), '') else manager_name end,
    manager_phone = case when d ? 'manager_phone' then nullif(left(regexp_replace(coalesce(d->>'manager_phone',''), '\D', '', 'g'), 13), '') else manager_phone end,
    manager_email = case when d ? 'manager_email' then nullif(left(trim(d->>'manager_email'), 200), '') else manager_email end,
    billing_data = coalesce(bd, billing_data),
    connection_method = coalesce(m, connection_method),
    brand_settings = coalesce(b, brand_settings)
  where id = p_store_id;
end $$;

revoke all on function public.save_onboarding_progress(uuid, integer, boolean, jsonb) from public, anon;
grant execute on function public.save_onboarding_progress(uuid, integer, boolean, jsonb) to authenticated;

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'stores'
  and column_name in ('store_email','store_whatsapp','manager_name','manager_phone','manager_email','billing_data');