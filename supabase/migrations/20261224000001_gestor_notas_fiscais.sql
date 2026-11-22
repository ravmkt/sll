-- Notas Fiscais (Gestor) - parte 1
create table if not exists public.gestor_nf_settings (
  store_id uuid primary key references public.stores(id) on delete cascade,
  mode text not null default 'manual' check (mode in ('manual','provedor')),
  provider text,
  environment text not null default 'homologacao' check (environment in ('homologacao','producao')),
  tax_regime text,
  cnpj text,
  ie text,
  serie int not null default 1,
  next_number int not null default 1,
  default_cfop text not null default '5102',
  updated_at timestamptz not null default now()
);

create table if not exists public.gestor_nf_notas (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  serie int not null default 1,
  number int not null,
  status text not null default 'pendente'
    check (status in ('pendente','emitida','autorizada','rejeitada','cancelada','inutilizada')),
  issued_at timestamptz not null default now(),
  recipient_name text,
  recipient_document text,
  recipient_email text,
  total numeric(14,2) not null default 0,
  channel text,
  access_key text,
  protocol text,
  xml_url text,
  danfe_url text,
  reject_reason text,
  cancel_reason text,
  provider_ref text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gestor_nf_notas_num_uq unique (store_id, serie, number),
  constraint gestor_nf_notas_key_ck check (access_key is null or access_key ~ '^[0-9]{44}$')
);
create unique index if not exists gestor_nf_notas_order_ativa_uq
  on public.gestor_nf_notas(order_id)
  where order_id is not null and status in ('pendente','emitida','autorizada');
create index if not exists gestor_nf_notas_lista_idx on public.gestor_nf_notas(store_id, issued_at desc);
create index if not exists gestor_nf_notas_status_idx on public.gestor_nf_notas(store_id, status);

create table if not exists public.gestor_nf_items (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nota_id uuid not null references public.gestor_nf_notas(id) on delete cascade,
  sku text,
  description text not null,
  ncm text,
  cfop text,
  qty numeric(14,3) not null default 1,
  unit_price numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0
);
create index if not exists gestor_nf_items_nota_idx on public.gestor_nf_items(nota_id);

create table if not exists public.gestor_nf_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  nota_id uuid not null references public.gestor_nf_notas(id) on delete cascade,
  type text not null,
  message text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists gestor_nf_events_nota_idx on public.gestor_nf_events(nota_id, created_at desc);

create table if not exists public.gestor_nf_inutilizadas (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  serie int not null default 1,
  number_from int not null,
  number_to int not null,
  reason text not null check (char_length(btrim(reason)) >= 15),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (number_to >= number_from)
);

create or replace function public.gestor_nf_touch() returns trigger
language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists gestor_nf_notas_touch on public.gestor_nf_notas;
create trigger gestor_nf_notas_touch before update on public.gestor_nf_notas
  for each row execute function public.gestor_nf_touch();
drop trigger if exists gestor_nf_settings_touch on public.gestor_nf_settings;
create trigger gestor_nf_settings_touch before update on public.gestor_nf_settings
  for each row execute function public.gestor_nf_touch();

-- RLS: leitura por permissao; escrita somente pelas RPCs abaixo
alter table public.gestor_nf_settings enable row level security;
alter table public.gestor_nf_notas enable row level security;
alter table public.gestor_nf_items enable row level security;
alter table public.gestor_nf_events enable row level security;
alter table public.gestor_nf_inutilizadas enable row level security;

drop policy if exists gestor_nf_settings_sel on public.gestor_nf_settings;
create policy gestor_nf_settings_sel on public.gestor_nf_settings for select
  using (public.gestor_can(store_id, 'notas_fiscais', 'view'));
drop policy if exists gestor_nf_notas_sel on public.gestor_nf_notas;
create policy gestor_nf_notas_sel on public.gestor_nf_notas for select
  using (public.gestor_can(store_id, 'notas_fiscais', 'view'));
drop policy if exists gestor_nf_items_sel on public.gestor_nf_items;
create policy gestor_nf_items_sel on public.gestor_nf_items for select
  using (public.gestor_can(store_id, 'notas_fiscais', 'view'));
drop policy if exists gestor_nf_events_sel on public.gestor_nf_events;
create policy gestor_nf_events_sel on public.gestor_nf_events for select
  using (public.gestor_can(store_id, 'notas_fiscais', 'view'));
drop policy if exists gestor_nf_inut_sel on public.gestor_nf_inutilizadas;
create policy gestor_nf_inut_sel on public.gestor_nf_inutilizadas for select
  using (public.gestor_can(store_id, 'notas_fiscais', 'view'));

-- Configuracao fiscal
create or replace function public.gestor_nf_settings_save(
  p_store uuid, p_mode text, p_provider text, p_environment text, p_tax_regime text,
  p_cnpj text, p_ie text, p_serie int, p_next_number int, p_cfop text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.gestor_can(p_store, 'notas_fiscais', 'edit') then
    raise exception 'Sem permissão para configurar notas fiscais.';
  end if;
  if coalesce(p_cnpj, '') <> '' and length(regexp_replace(p_cnpj, '\D', '', 'g')) <> 14 then
    raise exception 'CNPJ inválido.';
  end if;
  insert into public.gestor_nf_settings as s
    (store_id, mode, provider, environment, tax_regime, cnpj, ie, serie, next_number, default_cfop)
  values
    (p_store, coalesce(p_mode,'manual'), nullif(p_provider,''), coalesce(p_environment,'homologacao'),
     nullif(p_tax_regime,''), nullif(regexp_replace(coalesce(p_cnpj,''), '\D', '', 'g'),''), nullif(p_ie,''),
     greatest(coalesce(p_serie,1),1), greatest(coalesce(p_next_number,1),1), coalesce(nullif(p_cfop,''),'5102'))
  on conflict (store_id) do update set
    mode = excluded.mode, provider = excluded.provider, environment = excluded.environment,
    tax_regime = excluded.tax_regime, cnpj = excluded.cnpj, ie = excluded.ie,
    serie = excluded.serie, next_number = excluded.next_number, default_cfop = excluded.default_cfop;
end $$;

-- Proximo numero (uso interno das RPCs; evita buracos e duplicidade)
create or replace function public.gestor_nf_next_number(p_store uuid)
returns table(serie int, number int)
language plpgsql security definer set search_path = public as $$
begin
  insert into public.gestor_nf_settings(store_id) values (p_store) on conflict (store_id) do nothing;
  return query
    update public.gestor_nf_settings s set next_number = s.next_number + 1
    where s.store_id = p_store
    returning s.serie, s.next_number - 1;
end $$;

-- Modo manual: registra nota ja emitida fora do SLL
create or replace function public.gestor_nf_register_manual(
  p_store uuid, p_order uuid, p_serie int, p_number int, p_key text, p_xml_url text,
  p_issued date, p_name text, p_document text, p_total numeric, p_channel text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.gestor_can(p_store, 'notas_fiscais', 'edit') then
    raise exception 'Sem permissão para registrar notas fiscais.';
  end if;
  if p_number is null or p_number < 1 then raise exception 'Informe o número da nota.'; end if;
  if coalesce(p_key,'') <> '' and p_key !~ '^[0-9]{44}$' then
    raise exception 'A chave de acesso deve ter 44 números.';
  end if;
  begin
    insert into public.gestor_nf_notas
      (store_id, order_id, serie, number, status, issued_at, recipient_name, recipient_document,
       total, channel, access_key, xml_url)
    values
      (p_store, p_order, coalesce(p_serie,1), p_number, 'autorizada', coalesce(p_issued, current_date)::timestamptz,
       nullif(p_name,''), nullif(regexp_replace(coalesce(p_document,''), '\D', '', 'g'),''),
       coalesce(p_total,0), nullif(p_channel,''), nullif(p_key,''), nullif(p_xml_url,''))
    returning id into v_id;
  exception when unique_violation then
    raise exception 'Já existe nota com este número/série ou ativa para este pedido.';
  end;
  insert into public.gestor_nf_events(store_id, nota_id, type, message)
    values (p_store, v_id, 'registrada', 'Nota registrada manualmente.');
  return v_id;
end $$;

-- Cancelamento (justificativa >= 15 caracteres)
create or replace function public.gestor_nf_cancel(p_nota uuid, p_reason text)
returns void
language plpgsql security definer set search_path = public as $$
declare n record; v_mode text;
begin
  select * into n from public.gestor_nf_notas where id = p_nota;
  if not found then raise exception 'Nota não encontrada.'; end if;
  if not public.gestor_can(n.store_id, 'notas_fiscais', 'edit') then
    raise exception 'Sem permissão para cancelar notas fiscais.';
  end if;
  if char_length(btrim(coalesce(p_reason,''))) < 15 then
    raise exception 'A justificativa precisa ter 15 caracteres ou mais.';
  end if;
  if n.status in ('cancelada','inutilizada') then raise exception 'A nota já está %.', n.status; end if;
  select mode into v_mode from public.gestor_nf_settings where store_id = n.store_id;
  if coalesce(v_mode,'manual') = 'provedor' and n.status = 'autorizada' then
    raise exception 'Cancelar nota autorizada exige o provedor fiscal (ainda não ligado).';
  end if;
  update public.gestor_nf_notas set status = 'cancelada', cancel_reason = btrim(p_reason) where id = p_nota;
  insert into public.gestor_nf_events(store_id, nota_id, type, message)
    values (n.store_id, p_nota, 'cancelada', btrim(p_reason));
end $$;

-- Inutilizar faixa de numeracao (justificativa >= 15 caracteres)
create or replace function public.gestor_nf_inutilizar(p_store uuid, p_serie int, p_from int, p_to int, p_reason text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.gestor_can(p_store, 'notas_fiscais', 'edit') then
    raise exception 'Sem permissão para inutilizar numeração.';
  end if;
  if char_length(btrim(coalesce(p_reason,''))) < 15 then
    raise exception 'A justificativa precisa ter 15 caracteres ou mais.';
  end if;
  if p_from is null or p_to is null or p_from < 1 or p_to < p_from then
    raise exception 'Faixa de numeração inválida.';
  end if;
  if exists (select 1 from public.gestor_nf_notas
             where store_id = p_store and serie = coalesce(p_serie,1)
               and number between p_from and p_to and status in ('emitida','autorizada')) then
    raise exception 'Há nota emitida ou autorizada nesta faixa. Cancele-a antes.';
  end if;
  if exists (select 1 from public.gestor_nf_inutilizadas
             where store_id = p_store and serie = coalesce(p_serie,1)
               and number_from <= p_to and number_to >= p_from) then
    raise exception 'Esta faixa já foi inutilizada (total ou parcialmente).';
  end if;
  insert into public.gestor_nf_inutilizadas(store_id, serie, number_from, number_to, reason)
    values (p_store, coalesce(p_serie,1), p_from, p_to, btrim(p_reason)) returning id into v_id;
  update public.gestor_nf_notas set status = 'inutilizada', cancel_reason = btrim(p_reason)
    where store_id = p_store and serie = coalesce(p_serie,1) and number between p_from and p_to
      and status in ('pendente','rejeitada');
  return v_id;
end $$;

revoke all on function public.gestor_nf_next_number(uuid) from public, anon, authenticated;
revoke all on function public.gestor_nf_settings_save(uuid,text,text,text,text,text,text,int,int,text) from public, anon;
revoke all on function public.gestor_nf_register_manual(uuid,uuid,int,int,text,text,date,text,text,numeric,text) from public, anon;
revoke all on function public.gestor_nf_cancel(uuid,text) from public, anon;
revoke all on function public.gestor_nf_inutilizar(uuid,int,int,int,text) from public, anon;
grant execute on function public.gestor_nf_settings_save(uuid,text,text,text,text,text,text,int,int,text) to authenticated;
grant execute on function public.gestor_nf_register_manual(uuid,uuid,int,int,text,text,date,text,text,numeric,text) to authenticated;
grant execute on function public.gestor_nf_cancel(uuid,text) to authenticated;
grant execute on function public.gestor_nf_inutilizar(uuid,int,int,int,text) to authenticated;