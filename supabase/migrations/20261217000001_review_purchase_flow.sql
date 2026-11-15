begin;

-- 1) Reviews: pedido + todos os produtos comprados
alter table public.reviews
  add column if not exists order_id text,
  add column if not exists product_refs text[] not null default '{}',
  add column if not exists purchased jsonb not null default '[]'::jsonb;
create index if not exists reviews_refs_gin on public.reviews using gin (product_refs);
create unique index if not exists reviews_order_uidx on public.reviews (store_id, order_id)
  where order_id is not null and source = 'store';

-- 2) Configuracoes: modal pos-compra e formulario do convite (ativaveis separadamente)
alter table public.review_invite_settings
  add column if not exists postpurchase_enabled boolean not null default false,
  add column if not exists postpurchase_title text not null default 'Como foi sua compra?' check (length(postpurchase_title) <= 120),
  add column if not exists postpurchase_subtitle text not null default 'Sua opinião ajuda outros clientes. Leva 10 segundos.' check (length(postpurchase_subtitle) <= 200),
  add column if not exists invite_allow_media boolean not null default true,
  add column if not exists auto_approve_min_rating int not null default 0 check (auto_approve_min_rating between 0 and 5);

-- 3) Itens em formato publico (so nome, imagem e link http/https)
create or replace function public.review_items_public(p_items jsonb)
returns jsonb language sql immutable set search_path to 'public' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'name',  left(coalesce(i->>'name',''), 200),
    'image', case when left(coalesce(i->>'image',''),4) = 'http' then i->>'image' end,
    'url',   case when left(coalesce(i->>'url',''),4)   = 'http' then i->>'url'   end
  )), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end) i
$$;

-- 4) Pagina /avaliar/:token
create or replace function public.review_request_get(p_token text)
returns jsonb language plpgsql security definer set search_path to 'public' stable as $fn$
declare r public.review_requests%rowtype; s public.review_invite_settings%rowtype; st public.stores%rowtype;
begin
  if length(coalesce(p_token,'')) < 20 or length(p_token) > 100 then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  select * into r from public.review_requests where token = p_token;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status = 'reviewed' then return jsonb_build_object('ok', false, 'error', 'reviewed'); end if;
  if r.status = 'skipped' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;
  select * into s from public.review_invite_settings where store_id = r.store_id;
  select * into st from public.stores where id = r.store_id;
  return jsonb_build_object('ok', true,
    'store', jsonb_build_object('name', coalesce(nullif(st.reply_display_name,''), st.name), 'logo', st.logo_url, 'url', st.url),
    'customer', initcap(split_part(trim(coalesce(r.customer_name,'')), ' ', 1)),
    'items', public.review_items_public(r.items),
    'allow_media', coalesce(s.invite_allow_media, true));
end $fn$;

-- 5) Modal pos-compra (pagina de obrigado): localiza o pedido
create or replace function public.review_postpurchase_get(p_store_id uuid, p_sec text, p_order_id text)
returns jsonb language plpgsql security definer set search_path to 'public' stable as $fn$
declare r public.review_requests%rowtype; s public.review_invite_settings%rowtype; st public.stores%rowtype;
begin
  select * into st from public.stores where id = p_store_id and security_token is not null and security_token = p_sec;
  if not found then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select * into s from public.review_invite_settings where store_id = p_store_id;
  if not found or not s.postpurchase_enabled then return jsonb_build_object('ok', false, 'error', 'disabled'); end if;
  select * into r from public.review_requests where store_id = p_store_id and order_id = left(coalesce(p_order_id,''), 80);
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status <> 'scheduled' and r.status <> 'sending' and r.status <> 'sent' then
    return jsonb_build_object('ok', false, 'error', 'closed');
  end if;
  return jsonb_build_object('ok', true, 'token', r.token,
    'title', s.postpurchase_title, 'subtitle', s.postpurchase_subtitle,
    'store', jsonb_build_object('name', coalesce(nullif(st.reply_display_name,''), st.name), 'logo', st.logo_url),
    'customer', initcap(split_part(trim(coalesce(r.customer_name,'')), ' ', 1)),
    'items', public.review_items_public(r.items));
end $fn$;

-- 6) Envio da avaliacao (modal ou convite): 1 avaliacao por pedido, com todos os produtos
create or replace function public.review_request_submit(p_token text, p_data jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $fn$
declare
  x jsonb := coalesce(p_data, '{}'::jsonb);
  r public.review_requests%rowtype; s public.review_invite_settings%rowtype; v_has_s boolean;
  v_via text := case when x->>'via' = 'postpurchase' then 'postpurchase' else 'invite' end;
  v_rating int; v_body text := left(trim(coalesce(x->>'body','')), 2000);
  v_title text := left(trim(coalesce(x->>'title','')), 120);
  v_media jsonb := case when jsonb_typeof(x->'media') = 'array' then x->'media' else '[]'::jsonb end;
  v_pre text := 'https://flivmllysdhaydhogmhg.supabase.co/storage/v1/object/public/reviews/';
  v_pfx text; v_id uuid; e jsonb; v_vid int := 0; v_parts text[]; v_name text;
  v_refs text[]; v_pname text; v_status text;
begin
  if length(coalesce(p_token,'')) < 20 or length(p_token) > 100 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  select * into r from public.review_requests where token = p_token for update;
  if not found then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if r.status = 'reviewed' then return jsonb_build_object('ok', false, 'error', 'duplicate'); end if;
  if r.status = 'skipped' then return jsonb_build_object('ok', false, 'error', 'closed'); end if;

  select * into s from public.review_invite_settings where store_id = r.store_id;
  v_has_s := found;
  if v_via = 'postpurchase' and (not v_has_s or not s.postpurchase_enabled) then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;

  begin v_rating := (x->>'rating')::int; exception when others then v_rating := null; end;
  if v_rating is null or v_rating not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if v_body <> '' and length(v_body) < 5 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;

  if v_via = 'postpurchase' then
    v_media := '[]'::jsonb;
  elsif jsonb_array_length(v_media) > 0 then
    if v_has_s and not s.invite_allow_media then return jsonb_build_object('ok', false, 'error', 'disabled'); end if;
    if jsonb_array_length(v_media) > 3 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
    v_pfx := v_pre || 'submissions/' || r.store_id::text || '/';
    for e in select m from jsonb_array_elements(v_media) m loop
      if coalesce(e->>'kind','') not in ('image','video')
         or left(coalesce(e->>'url',''), length(v_pfx)) <> v_pfx
         or not exists (select 1 from storage.objects o where o.bucket_id = 'reviews' and o.name = substr(e->>'url', length(v_pre) + 1))
         or (nullif(e->>'poster_url','') is not null and (
               left(e->>'poster_url', length(v_pfx)) <> v_pfx
               or not exists (select 1 from storage.objects o where o.bucket_id = 'reviews' and o.name = substr(e->>'poster_url', length(v_pre) + 1))))
      then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
      if e->>'kind' = 'video' then v_vid := v_vid + 1; end if;
    end loop;
    if v_vid > 1 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  end if;

  v_parts := regexp_split_to_array(trim(coalesce(nullif(x->>'author_name',''), r.customer_name, '')), '\s+');
  v_name := case when array_length(v_parts,1) >= 2
                 then initcap(v_parts[1]) || ' ' || upper(left(v_parts[array_length(v_parts,1)],1)) || '.'
                 else initcap(coalesce(v_parts[1],'')) end;
  if length(trim(v_name)) < 2 then v_name := 'Cliente'; end if;

  select coalesce(array_agg(distinct lower(i->>'product_id')) filter (where coalesce(i->>'product_id','') <> ''), '{}'),
         left(coalesce(string_agg(i->>'name', ' + ') filter (where coalesce(i->>'name','') <> ''), ''), 200)
    into v_refs, v_pname
    from jsonb_array_elements(r.items) i;

  v_status := case when v_has_s and s.auto_approve_min_rating > 0 and v_rating >= s.auto_approve_min_rating
                   then 'approved' else 'pending' end;

  begin
    insert into public.reviews(store_id, source, product_ref, product_name, product_refs, purchased, order_id,
                               author_name, author_email, rating, title, body, review_date, verified, status)
    values (r.store_id, 'store', nullif(v_refs[1],''), nullif(v_pname,''), v_refs,
            (select coalesce(jsonb_agg(jsonb_build_object('product_id', i->>'product_id', 'name', i->>'name',
                      'image', i->>'image', 'url', i->>'url')), '[]'::jsonb)
               from jsonb_array_elements(case when jsonb_typeof(r.items) = 'array' then r.items else '[]'::jsonb end) i),
            r.order_id, v_name, r.customer_email, v_rating, v_title, v_body, now(), true, v_status)
    returning id into v_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end;

  if jsonb_array_length(v_media) > 0 then
    insert into public.review_media(review_id, store_id, kind, url, poster_url)
    select v_id, r.store_id, m->>'kind', m->>'url', nullif(m->>'poster_url','')
    from jsonb_array_elements(v_media) m;
  end if;

  update public.review_requests set status = 'reviewed', reviewed_at = now() where id = r.id;
  return jsonb_build_object('ok', true, 'approved', v_status = 'approved');
end $fn$;

-- 7) Leitura publica: avaliacao aparece em todos os produtos do pedido + devolve os produtos comprados
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
      and (v_keys is null or lower(r.product_ref) = any(v_keys) or r.product_refs && v_keys)
  )
  select jsonb_build_object('count', count(*), 'avg', coalesce(round(avg(rating)::numeric, 2), 0),
    'dist', jsonb_build_object('1', count(*) filter (where rating=1), '2', count(*) filter (where rating=2),
      '3', count(*) filter (where rating=3), '4', count(*) filter (where rating=4), '5', count(*) filter (where rating=5)))
  into v_stats from f;

  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.review_date desc), '[]'::jsonb) into v_list from (
    select r.id, r.source, r.author_name, r.rating, r.title, r.body, r.review_date, r.verified, r.helpful,
      coalesce((select jsonb_agg(jsonb_build_object('kind', m.kind, 'url', m.url, 'poster_url', m.poster_url) order by m.created_at)
                from public.review_media m where m.review_id = r.id), '[]'::jsonb) as media,
      public.review_items_public(r.purchased) as purchased
    from public.reviews r
    where r.store_id = p_store_id and r.status = 'approved'
      and r.rating >= greatest(coalesce(p_min_rating,1),1)
      and r.source = any(coalesce(p_sources, array['manual','store','google']))
      and (v_keys is null or lower(r.product_ref) = any(v_keys) or r.product_refs && v_keys)
    order by r.review_date desc
    limit least(greatest(coalesce(p_limit,12),1),50)
  ) t;
  return jsonb_build_object('stats', v_stats, 'reviews', v_list);
end $$;

revoke all on function public.review_items_public(jsonb) from public;
revoke all on function public.review_request_get(text) from public;
revoke all on function public.review_postpurchase_get(uuid,text,text) from public;
revoke all on function public.review_request_submit(text,jsonb) from public;
grant execute on function public.review_request_get(text) to anon, authenticated;
grant execute on function public.review_postpurchase_get(uuid,text,text) to anon, authenticated;
grant execute on function public.review_request_submit(text,jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
commit;