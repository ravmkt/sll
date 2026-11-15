-- Reviews (Pulse): dados em public (multi-modulo); config dos widgets em pulse
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  source text not null default 'manual' check (source in ('manual','store','google')),
  external_id text,
  product_ref text,
  product_name text,
  author_name text not null default '',
  rating int not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  review_date timestamptz not null default now(),
  verified boolean not null default false,
  status text not null default 'approved' check (status in ('pending','approved','rejected')),
  helpful int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists reviews_ext_uidx on public.reviews(store_id, source, external_id) where external_id is not null;
create index if not exists reviews_store_idx on public.reviews(store_id, status, source);
create index if not exists reviews_prod_idx on public.reviews(store_id, lower(product_ref));

create table if not exists public.review_media (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  url text not null,
  poster_url text,
  created_at timestamptz not null default now()
);
create index if not exists review_media_rev_idx on public.review_media(review_id);

create table if not exists pulse.review_widgets (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null default 'Reviews',
  active boolean not null default false,
  scope text not null default 'product' check (scope in ('product','storefront')),
  template text not null default 'cards_photo',
  min_rating int not null default 1 check (min_rating between 1 and 5),
  sources text[] not null default array['manual','store','google'],
  max_items int not null default 12 check (max_items between 1 and 50),
  placement jsonb not null default '{"selector":"","position":"after"}'::jsonb,
  design jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists review_widgets_store_idx on pulse.review_widgets(store_id, active);

alter table public.reviews enable row level security;
alter table public.review_media enable row level security;
alter table pulse.review_widgets enable row level security;
-- sem policies: acesso apenas pelas RPCs security definer

create or replace function public.reviews_can_manage(p_store_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select pulse.widgets_can_manage(p_store_id)
$$;

create or replace function public.reviews_list(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) || jsonb_build_object('media', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'url', m.url, 'poster_url', m.poster_url) order by m.created_at)
      from public.review_media m where m.review_id = r.id), '[]'::jsonb)) order by r.review_date desc)
    from public.reviews r where r.store_id = p_store_id), '[]'::jsonb);
end $$;

create or replace function public.review_save(p_store_id uuid, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; x jsonb := coalesce(p_data, '{}'::jsonb);
  v_rating int := (x->>'rating')::int;
  v_date timestamptz := coalesce(nullif(x->>'review_date','')::timestamptz, now());
  v_source text := coalesce(nullif(x->>'source',''), 'manual');
  v_status text := coalesce(nullif(x->>'status',''), 'approved');
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  if v_rating is null or v_rating not between 1 and 5 then raise exception 'invalid_rating'; end if;
  if v_source not in ('manual','store','google') then raise exception 'invalid_source'; end if;
  if v_status not in ('pending','approved','rejected') then raise exception 'invalid_status'; end if;
  if length(coalesce(x->>'body','')) > 5000 then raise exception 'body_too_large'; end if;
  if jsonb_typeof(coalesce(x->'media','[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(x->'media','[]'::jsonb)) > 10 then
    raise exception 'invalid_media';
  end if;

  if p_id is null then
    insert into public.reviews(store_id, source, product_ref, product_name, author_name, rating, title, body, review_date, verified, status)
    values (p_store_id, v_source, nullif(trim(x->>'product_ref'),''), nullif(trim(x->>'product_name'),''),
            coalesce(trim(x->>'author_name'),''), v_rating, coalesce(x->>'title',''), coalesce(x->>'body',''),
            v_date, coalesce((x->>'verified')::boolean, false), v_status)
    returning id into v_id;
  else
    update public.reviews set
      source = v_source, product_ref = nullif(trim(x->>'product_ref'),''), product_name = nullif(trim(x->>'product_name'),''),
      author_name = coalesce(trim(x->>'author_name'),''), rating = v_rating, title = coalesce(x->>'title',''),
      body = coalesce(x->>'body',''), review_date = v_date, verified = coalesce((x->>'verified')::boolean, false),
      status = v_status, updated_at = now()
    where id = p_id and store_id = p_store_id returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
  end if;

  if x ? 'media' then
    delete from public.review_media where review_id = v_id;
    insert into public.review_media(review_id, store_id, kind, url, poster_url)
    select v_id, p_store_id, m->>'kind', m->>'url', nullif(m->>'poster_url','')
    from jsonb_array_elements(x->'media') m
    where m->>'kind' in ('image','video') and coalesce(m->>'url','') <> '';
  end if;
  return jsonb_build_object('id', v_id);
end $$;

create or replace function public.review_set_status(p_store_id uuid, p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  if p_status not in ('pending','approved','rejected') then raise exception 'invalid_status'; end if;
  update public.reviews set status = p_status, updated_at = now() where id = p_id and store_id = p_store_id;
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.review_delete(p_store_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  delete from public.reviews where id = p_id and store_id = p_store_id;
end $$;

create or replace function public.review_widgets_list(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at)
                   from pulse.review_widgets w where w.store_id = p_store_id), '[]'::jsonb);
end $$;

create or replace function public.review_widget_save(p_store_id uuid, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; x jsonb := coalesce(p_data, '{}'::jsonb);
  v_name text := coalesce(nullif(trim(x->>'name'),''), 'Reviews');
  v_scope text := coalesce(nullif(x->>'scope',''), 'product');
  v_tpl text := coalesce(nullif(x->>'template',''), 'cards_photo');
  v_min int := least(greatest(coalesce((x->>'min_rating')::int, 1), 1), 5);
  v_max int := least(greatest(coalesce((x->>'max_items')::int, 12), 1), 50);
  v_src text[] := coalesce((select array_agg(s) from jsonb_array_elements_text(coalesce(x->'sources','["manual","store","google"]'::jsonb)) s
                             where s in ('manual','store','google')), array['manual','store','google']);
  v_pl jsonb := coalesce(x->'placement', '{"selector":"","position":"after"}'::jsonb);
  v_des jsonb := coalesce(x->'design', '{}'::jsonb);
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  if v_scope not in ('product','storefront') then raise exception 'invalid_scope'; end if;
  if v_tpl !~ '^[a-z0-9_]{1,40}$' then raise exception 'invalid_template'; end if;
  if length(v_des::text) > 100000 then raise exception 'design_too_large'; end if;

  if p_id is null then
    insert into pulse.review_widgets(store_id, name, active, scope, template, min_rating, sources, max_items, placement, design)
    values (p_store_id, v_name, coalesce((x->>'active')::boolean, false), v_scope, v_tpl, v_min, v_src, v_max, v_pl, v_des)
    returning id into v_id;
  else
    update pulse.review_widgets set name = v_name, active = coalesce((x->>'active')::boolean, false), scope = v_scope,
      template = v_tpl, min_rating = v_min, sources = v_src, max_items = v_max, placement = v_pl, design = v_des, updated_at = now()
    where id = p_id and store_id = p_store_id returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
  end if;
  return (select to_jsonb(w) from pulse.review_widgets w where w.id = v_id);
end $$;

create or replace function public.review_widget_set_active(p_store_id uuid, p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  update pulse.review_widgets set active = coalesce(p_active,false), updated_at = now() where id = p_id and store_id = p_store_id;
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.review_widget_delete(p_store_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  delete from pulse.review_widgets where id = p_id and store_id = p_store_id;
end $$;

-- leitura publica (widget da loja)
create or replace function public.reviews_public_config(p_store_id uuid)
returns jsonb language sql security definer set search_path = public stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'scope', w.scope, 'template', w.template,
    'min_rating', w.min_rating, 'sources', w.sources, 'max_items', w.max_items,
    'placement', w.placement, 'design', w.design) order by w.created_at), '[]'::jsonb)
  from pulse.review_widgets w where w.store_id = p_store_id and w.active
$$;

create or replace function public.reviews_public_data(
  p_store_id uuid, p_keys text[], p_min_rating int, p_sources text[], p_limit int)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v_keys text[]; v_stats jsonb; v_list jsonb;
begin
  select array_agg(lower(k)) into v_keys from unnest(coalesce(p_keys, '{}')) k where length(trim(k)) > 0;
  with f as (
    select r.* from public.reviews r
    where r.store_id = p_store_id and r.status = 'approved'
      and r.rating >= greatest(coalesce(p_min_rating,1),1)
      and r.source = any(coalesce(p_sources, array['manual','store','google']))
      and (v_keys is null or lower(r.product_ref) = any(v_keys))
  )
  select jsonb_build_object('count', count(*), 'avg', coalesce(round(avg(rating)::numeric, 2), 0),
    'dist', jsonb_build_object('1', count(*) filter (where rating=1), '2', count(*) filter (where rating=2),
      '3', count(*) filter (where rating=3), '4', count(*) filter (where rating=4), '5', count(*) filter (where rating=5)))
  into v_stats from f;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.review_date desc), '[]'::jsonb) into v_list from (
    select r.id, r.source, r.author_name, r.rating, r.title, r.body, r.review_date, r.verified, r.helpful,
      coalesce((select jsonb_agg(jsonb_build_object('kind', m.kind, 'url', m.url, 'poster_url', m.poster_url) order by m.created_at)
                from public.review_media m where m.review_id = r.id), '[]'::jsonb) as media
    from public.reviews r
    where r.store_id = p_store_id and r.status = 'approved'
      and r.rating >= greatest(coalesce(p_min_rating,1),1)
      and r.source = any(coalesce(p_sources, array['manual','store','google']))
      and (v_keys is null or lower(r.product_ref) = any(v_keys))
    order by r.review_date desc
    limit least(greatest(coalesce(p_limit,12),1),50)
  ) t;
  return jsonb_build_object('stats', v_stats, 'reviews', v_list);
end $$;

-- storage (fotos WebP e videos)
insert into storage.buckets(id, name, public, file_size_limit)
values ('reviews', 'reviews', true, 52428800) on conflict (id) do nothing;
drop policy if exists reviews_media_insert on storage.objects;
drop policy if exists reviews_media_update on storage.objects;
drop policy if exists reviews_media_delete on storage.objects;
create policy reviews_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'reviews' and public.reviews_can_manage(((storage.foldername(name))[1])::uuid));
create policy reviews_media_update on storage.objects for update to authenticated
  using (bucket_id = 'reviews' and public.reviews_can_manage(((storage.foldername(name))[1])::uuid));
create policy reviews_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'reviews' and public.reviews_can_manage(((storage.foldername(name))[1])::uuid));

revoke all on function public.reviews_can_manage(uuid) from public;
revoke all on function public.reviews_list(uuid) from public;
revoke all on function public.review_save(uuid,uuid,jsonb) from public;
revoke all on function public.review_set_status(uuid,uuid,text) from public;
revoke all on function public.review_delete(uuid,uuid) from public;
revoke all on function public.review_widgets_list(uuid) from public;
revoke all on function public.review_widget_save(uuid,uuid,jsonb) from public;
revoke all on function public.review_widget_set_active(uuid,uuid,boolean) from public;
revoke all on function public.review_widget_delete(uuid,uuid) from public;
revoke all on function public.reviews_public_config(uuid) from public;
revoke all on function public.reviews_public_data(uuid,text[],int,text[],int) from public;
grant execute on function public.reviews_can_manage(uuid) to authenticated;
grant execute on function public.reviews_list(uuid) to authenticated;
grant execute on function public.review_save(uuid,uuid,jsonb) to authenticated;
grant execute on function public.review_set_status(uuid,uuid,text) to authenticated;
grant execute on function public.review_delete(uuid,uuid) to authenticated;
grant execute on function public.review_widgets_list(uuid) to authenticated;
grant execute on function public.review_widget_save(uuid,uuid,jsonb) to authenticated;
grant execute on function public.review_widget_set_active(uuid,uuid,boolean) to authenticated;
grant execute on function public.review_widget_delete(uuid,uuid) to authenticated;
grant execute on function public.reviews_public_config(uuid) to anon, authenticated;
grant execute on function public.reviews_public_data(uuid,text[],int,text[],int) to anon, authenticated;

notify pgrst, 'reload schema';
