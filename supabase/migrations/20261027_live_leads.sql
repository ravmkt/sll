create table if not exists live_commerce.live_leads (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  live_id uuid references live_commerce.lives(id) on delete set null,
  name text not null,
  email text not null,
  whatsapp text not null,
  source text not null default 'live_ended',
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists live_leads_store_email_uidx
  on live_commerce.live_leads (store_id, lower(email));

alter table live_commerce.live_leads enable row level security;

drop policy if exists live_leads_select_owner on live_commerce.live_leads;
do $$
begin
  if to_regprocedure('live_commerce.is_store_owner(uuid)') is not null then
    execute 'create policy live_leads_select_owner on live_commerce.live_leads for select to authenticated using (live_commerce.is_store_owner(store_id))';
  else
    raise notice 'is_store_owner nao existe: policy de leitura nao criada.';
  end if;
end $$;

create or replace function live_commerce.register_live_lead(
  p_live_id uuid, p_name text, p_email text, p_whatsapp text
)
returns jsonb
language plpgsql
security definer
set search_path = live_commerce, public
as $$
declare
  v_store uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := regexp_replace(coalesce(p_whatsapp, ''), '\D', '', 'g');
begin
  select store_id into v_store from live_commerce.lives where id = p_live_id;
  if v_store is null then raise exception 'live_not_found'; end if;
  if length(v_name) < 2 or length(v_name) > 120 then raise exception 'invalid_name'; end if;
  if length(v_email) > 160 or v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'invalid_email'; end if;
  if length(v_phone) < 10 or length(v_phone) > 15 then raise exception 'invalid_phone'; end if;

  insert into live_commerce.live_leads (store_id, live_id, name, email, whatsapp)
  values (v_store, p_live_id, v_name, v_email, v_phone)
  on conflict (store_id, lower(email))
  do update set name = excluded.name, whatsapp = excluded.whatsapp, live_id = excluded.live_id;

  return jsonb_build_object('ok', true);
end
$$;

revoke all on function live_commerce.register_live_lead(uuid, text, text, text) from public;
grant execute on function live_commerce.register_live_lead(uuid, text, text, text) to anon, authenticated;
notify pgrst, 'reload schema';