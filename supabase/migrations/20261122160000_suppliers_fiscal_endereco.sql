do $$
begin
  if to_regclass('erp.suppliers') is null then
    raise exception 'Tabela erp.suppliers nao encontrada';
  end if;
end $$;

alter table erp.suppliers
  add column if not exists person_type text not null default 'pj',
  add column if not exists legal_name text,
  add column if not exists trade_name text,
  add column if not exists ie text,
  add column if not exists ie_indicator smallint not null default 9,
  add column if not exists im text,
  add column if not exists tax_regime text,
  add column if not exists email_xml text,
  add column if not exists zip text,
  add column if not exists street text,
  add column if not exists number text,
  add column if not exists complement text,
  add column if not exists district text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists city_ibge text,
  add column if not exists bank_code text,
  add column if not exists bank_name text,
  add column if not exists bank_agency text,
  add column if not exists bank_account text,
  add column if not exists bank_account_type text,
  add column if not exists pix_key_type text,
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

comment on column erp.suppliers.ie_indicator is '1 = contribuinte, 2 = isento, 9 = nao contribuinte';