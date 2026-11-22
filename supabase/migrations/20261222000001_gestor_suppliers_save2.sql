-- Fornecedores 2/2: colunas (idempotente) + RPC que atualiza so os campos enviados

alter table erp.suppliers
  add column if not exists legal_name text,
  add column if not exists person_type text,
  add column if not exists ie text,
  add column if not exists ie_indicator integer,
  add column if not exists im text,
  add column if not exists tax_regime text,
  add column if not exists zip text,
  add column if not exists street text,
  add column if not exists number text,
  add column if not exists complement text,
  add column if not exists district text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists ibge_code text,
  add column if not exists bank_name text,
  add column if not exists bank_agency text,
  add column if not exists bank_account text,
  add column if not exists pix_key text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'suppliers_person_type_chk') then
    alter table erp.suppliers add constraint suppliers_person_type_chk check (person_type in ('pj','pf','exterior'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suppliers_ie_indicator_chk') then
    alter table erp.suppliers add constraint suppliers_ie_indicator_chk check (ie_indicator in (1,2,9));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'suppliers_tax_regime_chk') then
    alter table erp.suppliers add constraint suppliers_tax_regime_chk check (tax_regime is null or tax_regime in ('simples','mei','presumido','real'));
  end if;
end $$;

-- Recria a listagem para acompanhar as colunas novas
create or replace function public.gestor_suppliers(p_store uuid)
returns setof erp.suppliers language plpgsql security definer set search_path = public, erp as $$
begin
  if not public.is_store_owner_or_member(p_store) then raise exception 'Sem acesso a esta loja'; end if;
  return query select * from erp.suppliers where store_id = p_store order by active desc, name;
end $$;
revoke all on function public.gestor_suppliers(uuid) from public, anon;
grant execute on function public.gestor_suppliers(uuid) to authenticated;

create or replace function public.gestor_supplier_save2(p_store uuid, p_id uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path = public, erp as $$
declare v_id uuid; v_name text;
begin
  if not public.gestor_can_write(p_store) then raise exception 'Sem permissao para editar'; end if;
  p_data := coalesce(p_data, '{}'::jsonb);

  if p_id is null then
    v_name := btrim(coalesce(p_data->>'name', ''));
    if v_name = '' then raise exception 'Informe o nome do fornecedor'; end if;
    insert into erp.suppliers (store_id, name) values (p_store, v_name) returning id into v_id;
  else
    select id into v_id from erp.suppliers where id = p_id and store_id = p_store;
    if v_id is null then raise exception 'Fornecedor nao encontrado'; end if;
  end if;

  update erp.suppliers s set
    name = case when p_data ? 'name' then coalesce(nullif(btrim(p_data->>'name'), ''), s.name) else s.name end,
    legal_name = case when p_data ? 'legal_name' then nullif(btrim(p_data->>'legal_name'), '') else s.legal_name end,
    person_type = case when p_data ? 'person_type' then nullif(btrim(p_data->>'person_type'), '') else s.person_type end,
    document = case when p_data ? 'document' then nullif(regexp_replace(coalesce(p_data->>'document', ''), '\D', '', 'g'), '') else s.document end,
    ie = case when p_data ? 'ie' then nullif(btrim(p_data->>'ie'), '') else s.ie end,
    ie_indicator = case when p_data ? 'ie_indicator' then nullif(p_data->>'ie_indicator', '')::integer else s.ie_indicator end,
    im = case when p_data ? 'im' then nullif(btrim(p_data->>'im'), '') else s.im end,
    tax_regime = case when p_data ? 'tax_regime' then nullif(btrim(p_data->>'tax_regime'), '') else s.tax_regime end,
    email = case when p_data ? 'email' then nullif(lower(btrim(p_data->>'email')), '') else s.email end,
    phone = case when p_data ? 'phone' then nullif(btrim(p_data->>'phone'), '') else s.phone end,
    contact_name = case when p_data ? 'contact_name' then nullif(btrim(p_data->>'contact_name'), '') else s.contact_name end,
    zip = case when p_data ? 'zip' then nullif(regexp_replace(coalesce(p_data->>'zip', ''), '\D', '', 'g'), '') else s.zip end,
    street = case when p_data ? 'street' then nullif(btrim(p_data->>'street'), '') else s.street end,
    number = case when p_data ? 'number' then nullif(btrim(p_data->>'number'), '') else s.number end,
    complement = case when p_data ? 'complement' then nullif(btrim(p_data->>'complement'), '') else s.complement end,
    district = case when p_data ? 'district' then nullif(btrim(p_data->>'district'), '') else s.district end,
    city = case when p_data ? 'city' then nullif(btrim(p_data->>'city'), '') else s.city end,
    state = case when p_data ? 'state' then nullif(upper(btrim(p_data->>'state')), '') else s.state end,
    ibge_code = case when p_data ? 'ibge_code' then nullif(regexp_replace(coalesce(p_data->>'ibge_code', ''), '\D', '', 'g'), '') else s.ibge_code end,
    lead_time_days = case when p_data ? 'lead_time_days' then nullif(p_data->>'lead_time_days', '')::integer else s.lead_time_days end,
    payment_terms = case when p_data ? 'payment_terms' then nullif(btrim(p_data->>'payment_terms'), '') else s.payment_terms end,
    bank_name = case when p_data ? 'bank_name' then nullif(btrim(p_data->>'bank_name'), '') else s.bank_name end,
    bank_agency = case when p_data ? 'bank_agency' then nullif(btrim(p_data->>'bank_agency'), '') else s.bank_agency end,
    bank_account = case when p_data ? 'bank_account' then nullif(btrim(p_data->>'bank_account'), '') else s.bank_account end,
    pix_key = case when p_data ? 'pix_key' then nullif(btrim(p_data->>'pix_key'), '') else s.pix_key end,
    notes = case when p_data ? 'notes' then nullif(btrim(p_data->>'notes'), '') else s.notes end,
    active = case when p_data ? 'active' then coalesce((p_data->>'active')::boolean, s.active) else s.active end
  where s.id = v_id;

  return v_id;
exception when unique_violation then
  raise exception 'Ja existe um fornecedor com esse nome';
end $$;
revoke all on function public.gestor_supplier_save2(uuid, uuid, jsonb) from public, anon;
grant execute on function public.gestor_supplier_save2(uuid, uuid, jsonb) to authenticated;

notify pgrst, 'reload schema';

select column_name, data_type from information_schema.columns
 where table_schema = 'erp' and table_name = 'suppliers' order by ordinal_position;