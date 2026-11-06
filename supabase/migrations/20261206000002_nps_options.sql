create table if not exists public.admin_nps_options (
  kind text not null check (kind in ('pain','feature')),
  key text not null check (key ~ '^[a-z0-9_]{1,40}$'),
  label text not null check (char_length(btrim(label)) between 1 and 60),
  sort_order int not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (kind, key)
);
alter table public.admin_nps_options enable row level security;
revoke all on public.admin_nps_options from anon, authenticated;

insert into public.admin_nps_options (kind, key, label, sort_order) values
  ('pain','dificuldade_instalacao','Dificuldade na instalação',1),
  ('pain','poucos_recursos','Faltam funcionalidades',2),
  ('pain','preco','Preço',3),
  ('pain','desempenho','Desempenho / lentidão',4),
  ('pain','suporte','Suporte',5),
  ('pain','outro','Outro',6),
  ('feature','vidlytics','Vidlytics (vídeos)',1),
  ('feature','live_commerce','Live Commerce',2),
  ('feature','analytics','Analytics',3),
  ('feature','noah','Noah (assistente)',4),
  ('feature','widgets','Widgets',5)
on conflict (kind, key) do nothing;

-- Lojista: opções ativas
create or replace function public.get_nps_options()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'key', key, 'label', label)
                                    order by kind, sort_order, key)
                   from public.admin_nps_options where active), '[]'::jsonb);
end $$;

-- Master: lista completa
create or replace function public.admin_nps_list_options()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'key', key, 'label', label,
                                    'sort_order', sort_order, 'active', active)
                                    order by kind, sort_order, key)
                   from public.admin_nps_options), '[]'::jsonb);
end $$;

-- Master: salva (upsert; nunca apaga)
create or replace function public.admin_nps_save_options(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p is null or jsonb_typeof(p) <> 'array' then raise exception 'invalid_payload'; end if;
  for r in select * from jsonb_array_elements(p) loop
    if r->>'kind' not in ('pain','feature') then raise exception 'invalid_kind'; end if;
    insert into public.admin_nps_options (kind, key, label, sort_order, active)
    values (r->>'kind', r->>'key', left(btrim(r->>'label'), 60),
            coalesce((r->>'sort_order')::int, 0), coalesce((r->>'active')::boolean, true))
    on conflict (kind, key) do update set
      label = excluded.label, sort_order = excluded.sort_order,
      active = excluded.active, updated_at = now();
  end loop;
end $$;

revoke all on function public.get_nps_options() from public, anon;
revoke all on function public.admin_nps_list_options() from public, anon;
revoke all on function public.admin_nps_save_options(jsonb) from public, anon;
grant execute on function public.get_nps_options() to authenticated;
grant execute on function public.admin_nps_list_options() to authenticated;
grant execute on function public.admin_nps_save_options(jsonb) to authenticated;