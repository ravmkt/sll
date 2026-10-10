alter table public.stores add column if not exists onboarding_step integer not null default 1;
alter table public.stores add column if not exists onboarding_completed boolean not null default false;
alter table public.stores add column if not exists store_url text;
alter table public.stores add column if not exists store_niche text;
alter table public.stores add column if not exists manager_whatsapp text;
alter table public.stores add column if not exists connection_method text not null default 'gtm';
alter table public.stores add column if not exists brand_settings jsonb not null default '{}'::jsonb;

-- Backfill unico: lojas existentes nao passam pelo wizard
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'stores' and column_name = 'script_verified') then
    alter table public.stores add column script_verified boolean not null default false;
    update public.stores set onboarding_completed = true where onboarding_completed = false and onboarding_step = 1;
  end if;
end $$;

alter table public.stores drop constraint if exists stores_connection_method_chk;
alter table public.stores add constraint stores_connection_method_chk check (connection_method in ('gtm','yampi','manual'));

create or replace function public.save_onboarding_progress(
  p_store_id uuid, p_step integer, p_completed boolean, p_data jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  d jsonb := coalesce(p_data, '{}'::jsonb);
  b jsonb := d->'brand_settings';
  m text := d->>'connection_method';
  w text := regexp_replace(coalesce(d->>'manager_whatsapp', ''), '\D', '', 'g');
begin
  if not exists (select 1 from public.stores where id = p_store_id and owner_user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  if m is not null and m not in ('gtm','yampi','manual') then raise exception 'metodo de conexao invalido'; end if;
  if w <> '' and length(w) not between 10 and 13 then raise exception 'whatsapp invalido'; end if;
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
    onboarding_step = greatest(1, least(coalesce(p_step, 1), 4)),
    onboarding_completed = onboarding_completed or coalesce(p_completed, false),
    store_url = case when d ? 'store_url' then nullif(left(trim(d->>'store_url'), 300), '') else store_url end,
    store_niche = case when d ? 'store_niche' then nullif(left(trim(d->>'store_niche'), 80), '') else store_niche end,
    manager_whatsapp = case when d ? 'manager_whatsapp' then nullif(w, '') else manager_whatsapp end,
    connection_method = coalesce(m, connection_method),
    brand_settings = coalesce(b, brand_settings)
  where id = p_store_id;
end $$;

create or replace function public.verify_script_connection(p_store_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_ok boolean := false;
begin
  if not exists (select 1 from public.stores where id = p_store_id and owner_user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  if to_regclass('public.store_activity_events') is not null then
    begin
      execute 'select exists (select 1 from public.store_activity_events where store_id = $1)' into v_ok using p_store_id;
    exception when others then v_ok := false;
    end;
  end if;
  if v_ok then update public.stores set script_verified = true where id = p_store_id; end if;
  return coalesce(v_ok, false);
end $$;

revoke all on function public.save_onboarding_progress(uuid, integer, boolean, jsonb) from public, anon;
revoke all on function public.verify_script_connection(uuid) from public, anon;
grant execute on function public.save_onboarding_progress(uuid, integer, boolean, jsonb) to authenticated;
grant execute on function public.verify_script_connection(uuid) to authenticated;

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'stores'
  and column_name in ('onboarding_step','onboarding_completed','store_url','store_niche','manager_whatsapp','connection_method','script_verified','brand_settings');