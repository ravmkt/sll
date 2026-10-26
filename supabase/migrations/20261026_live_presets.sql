create table if not exists live_commerce.live_presets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  kind text not null check (kind in ('coupon', 'advantage')),
  title text not null check (length(btrim(title)) between 1 and 120),
  description text not null default '' check (length(description) <= 300),
  created_at timestamptz not null default now()
);

create unique index if not exists live_presets_uniq
  on live_commerce.live_presets (store_id, kind, upper(btrim(title)));

alter table live_commerce.live_presets enable row level security;

grant select, insert, update, delete on live_commerce.live_presets to authenticated;
grant all on live_commerce.live_presets to service_role;

-- Reaproveita as mesmas regras de acesso por loja da tabela lives (sem acesso anonimo)
do $$
declare
  r record;
  n int := 0;
  stmt text;
begin
  for r in
    select policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname = 'live_commerce' and tablename = 'lives'
      and not (roles && array['anon', 'public']::name[])
  loop
    stmt := format('create policy %I on live_commerce.live_presets for %s to %s',
      'presets_' || r.policyname, r.cmd, array_to_string(r.roles, ', '));
    if r.qual is not null then
      stmt := stmt || ' using (' || replace(r.qual, 'lives.', 'live_presets.') || ')';
    end if;
    if r.with_check is not null then
      stmt := stmt || ' with check (' || replace(r.with_check, 'lives.', 'live_presets.') || ')';
    end if;
    execute format('drop policy if exists %I on live_commerce.live_presets', 'presets_' || r.policyname);
    execute stmt;
    n := n + 1;
  end loop;

  if n = 0 then
    raise exception 'Nenhuma policy de live_commerce.lives pode ser copiada. Avise o agente para criar as policies de live_presets.';
  end if;
end $$;