-- Empresa do Gestor: dados cadastrais e fiscais (um registro por loja)
create table if not exists public.gestor_company (
  store_id     uuid primary key references public.stores(id) on delete cascade,
  legal_name   text,
  trade_name   text,
  cnpj         text,
  ie           text,
  ie_exempt    boolean not null default false,
  im           text,
  cnae         text,
  tax_regime   text,
  email        text,
  phone        text,
  website      text,
  zip          text,
  street       text,
  number       text,
  complement   text,
  district     text,
  city         text,
  state        text,
  ibge_code    text,
  updated_at   timestamptz not null default now(),
  updated_by   uuid,
  constraint gestor_company_regime_chk check (tax_regime is null or tax_regime in ('mei','simples','presumido','real'))
);
alter table public.gestor_company enable row level security;

create or replace function public.gestor_company_get(p_store uuid)
returns jsonb
language plpgsql stable security definer set search_path to 'public'
as $function$
declare c public.gestor_company; j jsonb; v_edit boolean; v_logo text;
begin
  if not exists (select 1 from public.store_members sm where sm.store_id = p_store and sm.user_id = auth.uid())
     and not exists (select 1 from public.stores s where s.id = p_store and s.owner_user_id = auth.uid())
     and not public.gestor_fin_can(p_store, 'ver') then
    raise exception 'Sem acesso a esta loja';
  end if;
  v_edit := public.gestor_fin_can(p_store, 'editar');

  select s.logo_url into v_logo from public.stores s where s.id = p_store;

  select * into c from public.gestor_company where store_id = p_store;
  if found then
    return jsonb_build_object('saved', true, 'can_edit', v_edit,
      'company', (to_jsonb(c) - 'store_id' - 'updated_at' - 'updated_by')
                 || jsonb_build_object('logo_url', coalesce(v_logo, '')));
  end if;

  -- ainda nao cadastrada: sugere o que ja existe na loja do SLL Hub
  select to_jsonb(s) into j from public.stores s where s.id = p_store;
  return jsonb_build_object('saved', false, 'can_edit', v_edit, 'company', jsonb_build_object(
    'logo_url', coalesce(v_logo, ''),
    'trade_name', coalesce(j->>'name', j->>'store_name'),
    'legal_name', coalesce(j->'billing_data'->>'legal_name', j->'billing_data'->>'razao_social', j->>'legal_name', j->>'company_name'),
    'cnpj', regexp_replace(coalesce(j->'billing_data'->>'cnpj', j->>'cnpj', j->>'document', j->>'cpf_cnpj', ''), '\D', '', 'g'),
    'email', coalesce(nullif(j->>'store_email', ''), nullif(j->>'contact_email', ''), j->>'email'),
    'phone', coalesce(nullif(j->>'store_whatsapp', ''), nullif(j->>'whatsapp', ''), j->>'contact_phone', j->>'phone'),
    'website', coalesce(nullif(j->>'store_url', ''), j->>'url', j->>'website'),
    'zip', coalesce(j->'billing_data'->>'zip', j->'billing_data'->>'cep'),
    'street', coalesce(j->'billing_data'->>'street', j->'billing_data'->>'address'),
    'number', coalesce(j->'billing_data'->>'number', j->'billing_data'->>'numero'),
    'complement', coalesce(j->'billing_data'->>'complement', j->'billing_data'->>'complemento'),
    'district', coalesce(j->'billing_data'->>'district', j->'billing_data'->>'neighborhood', j->'billing_data'->>'bairro'),
    'city', coalesce(j->'billing_data'->>'city', j->'billing_data'->>'cidade'),
    'state', coalesce(j->'billing_data'->>'state', j->'billing_data'->>'uf')
  ));
end $function$;

create or replace function public.gestor_company_save(p_store uuid, p_data jsonb)
returns void
language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_cnpj  text := regexp_replace(coalesce(p_data->>'cnpj', ''), '\D', '', 'g');
  v_zip   text := regexp_replace(coalesce(p_data->>'zip', ''), '\D', '', 'g');
  v_cnae  text := regexp_replace(coalesce(p_data->>'cnae', ''), '\D', '', 'g');
  v_ibge  text := regexp_replace(coalesce(p_data->>'ibge_code', ''), '\D', '', 'g');
  v_state text := upper(btrim(coalesce(p_data->>'state', '')));
  v_reg   text := nullif(btrim(coalesce(p_data->>'tax_regime', '')), '');
  v_email text := lower(btrim(coalesce(p_data->>'email', '')));
  v_exempt boolean := coalesce((p_data->>'ie_exempt')::boolean, false);
  v_ie    text := nullif(btrim(coalesce(p_data->>'ie', '')), '');
  v_logo  text := nullif(btrim(coalesce(p_data->>'logo_url', '')), '');
begin
  if not public.gestor_fin_can(p_store, 'editar') then
    raise exception 'Sem permissão para editar os dados da empresa';
  end if;
  if not v_exempt and v_ie is null then
    raise exception 'Preencha a inscrição estadual ou marque "Isento de IE" para salvar';
  end if;
  if v_logo is not null and v_logo !~* '^https?://' then
    raise exception 'Logotipo inválido';
  end if;
  if v_cnpj <> '' and length(v_cnpj) <> 14 then raise exception 'CNPJ deve ter 14 dígitos'; end if;
  if v_zip <> '' and length(v_zip) <> 8 then raise exception 'CEP deve ter 8 dígitos'; end if;
  if v_cnae <> '' and length(v_cnae) <> 7 then raise exception 'CNAE deve ter 7 dígitos'; end if;
  if v_state <> '' and v_state !~ '^[A-Z]{2}$' then raise exception 'UF deve ter 2 letras'; end if;
  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'E-mail inválido'; end if;
  if v_reg is not null and v_reg not in ('mei','simples','presumido','real') then raise exception 'Regime tributário inválido'; end if;

  insert into public.gestor_company as g (
    store_id, legal_name, trade_name, cnpj, ie, ie_exempt, im, cnae, tax_regime, email, phone, website,
    zip, street, number, complement, district, city, state, ibge_code, updated_at, updated_by)
  values (
    p_store,
    nullif(btrim(coalesce(p_data->>'legal_name', '')), ''),
    nullif(btrim(coalesce(p_data->>'trade_name', '')), ''),
    nullif(v_cnpj, ''),
    case when v_exempt then null else nullif(btrim(coalesce(p_data->>'ie', '')), '') end,
    v_exempt,
    nullif(btrim(coalesce(p_data->>'im', '')), ''),
    nullif(v_cnae, ''),
    v_reg,
    nullif(v_email, ''),
    nullif(btrim(coalesce(p_data->>'phone', '')), ''),
    nullif(btrim(coalesce(p_data->>'website', '')), ''),
    nullif(v_zip, ''),
    nullif(btrim(coalesce(p_data->>'street', '')), ''),
    nullif(btrim(coalesce(p_data->>'number', '')), ''),
    nullif(btrim(coalesce(p_data->>'complement', '')), ''),
    nullif(btrim(coalesce(p_data->>'district', '')), ''),
    nullif(btrim(coalesce(p_data->>'city', '')), ''),
    nullif(v_state, ''),
    nullif(v_ibge, ''),
    now(), auth.uid())
  on conflict (store_id) do update set
    legal_name = excluded.legal_name, trade_name = excluded.trade_name, cnpj = excluded.cnpj,
    ie = excluded.ie, ie_exempt = excluded.ie_exempt, im = excluded.im, cnae = excluded.cnae,
    tax_regime = excluded.tax_regime, email = excluded.email, phone = excluded.phone, website = excluded.website,
    zip = excluded.zip, street = excluded.street, number = excluded.number, complement = excluded.complement,
    district = excluded.district, city = excluded.city, state = excluded.state, ibge_code = excluded.ibge_code,
    updated_at = now(), updated_by = auth.uid();

  -- Sincroniza com o cadastro da loja no SLL Hub
  if p_data ? 'logo_url' then
    update public.stores set logo_url = v_logo, updated_at = now() where id = p_store;
  end if;

  begin
    update public.stores s set
      store_email    = coalesce(nullif(s.store_email, ''), nullif(v_email, '')),
      store_whatsapp = coalesce(nullif(s.store_whatsapp, ''), nullif(btrim(coalesce(p_data->>'phone', '')), '')),
      store_url      = coalesce(nullif(s.store_url, ''), nullif(btrim(coalesce(p_data->>'website', '')), ''))
    where s.id = p_store;
  exception when others then
    raise notice 'Hub: contato nao sincronizado: %', sqlerrm;
  end;

  begin
    update public.stores s set billing_data =
      (case when jsonb_typeof(to_jsonb(s.billing_data)) = 'object' then to_jsonb(s.billing_data) else '{}'::jsonb end)
      || jsonb_strip_nulls(jsonb_build_object(
           'legal_name', nullif(btrim(coalesce(p_data->>'legal_name', '')), ''),
           'cnpj', nullif(v_cnpj, ''),
           'ie', case when v_exempt then null else v_ie end,
           'zip', nullif(v_zip, ''),
           'street', nullif(btrim(coalesce(p_data->>'street', '')), ''),
           'number', nullif(btrim(coalesce(p_data->>'number', '')), ''),
           'complement', nullif(btrim(coalesce(p_data->>'complement', '')), ''),
           'district', nullif(btrim(coalesce(p_data->>'district', '')), ''),
           'city', nullif(btrim(coalesce(p_data->>'city', '')), ''),
           'state', nullif(v_state, '')))
    where s.id = p_store;
  exception when others then
    raise notice 'Hub: dados de cobranca nao sincronizados: %', sqlerrm;
  end;
end $function$;

revoke all on function public.gestor_company_get(uuid) from public, anon;
revoke all on function public.gestor_company_save(uuid, jsonb) from public, anon;
grant execute on function public.gestor_company_get(uuid) to authenticated;
grant execute on function public.gestor_company_save(uuid, jsonb) to authenticated;

-- Logotipos da loja (bucket publico; so quem edita a Empresa envia, na pasta da propria loja)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('store-logos', 'store-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.gestor_logo_store(p_name text)
returns uuid language sql immutable as $fn$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end
$fn$;

drop policy if exists store_logos_read on storage.objects;
create policy store_logos_read on storage.objects for select
  using (bucket_id = 'store-logos');

drop policy if exists store_logos_insert on storage.objects;
create policy store_logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'store-logos' and public.gestor_fin_can(public.gestor_logo_store(name), 'editar'));

drop policy if exists store_logos_update on storage.objects;
create policy store_logos_update on storage.objects for update to authenticated
  using (bucket_id = 'store-logos' and public.gestor_fin_can(public.gestor_logo_store(name), 'editar'));

drop policy if exists store_logos_delete on storage.objects;
create policy store_logos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'store-logos' and public.gestor_fin_can(public.gestor_logo_store(name), 'editar'));

notify pgrst, 'reload schema';

-- Conferencia: me envie este resultado
select jsonb_build_object(
  'tabela', to_regclass('public.gestor_company') is not null,
  'funcoes', (select count(*) from pg_proc where proname in ('gestor_company_get', 'gestor_company_save')),
  'colunas_da_loja_no_hub', (select jsonb_agg(column_name order by ordinal_position)
                               from information_schema.columns
                              where table_schema = 'public' and table_name = 'stores')
) as resultado;