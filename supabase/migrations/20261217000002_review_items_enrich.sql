begin;

alter table public.review_requests add column if not exists claimed_at timestamptz;

create or replace function public.review_items_enrich(p_store_id uuid, p_items jsonb)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select coalesce(jsonb_agg(
    i || jsonb_build_object(
      'product_id', coalesce(nullif(i->>'product_id',''), nullif(i->>'id','')),
      'name',  coalesce(nullif(i->>'name',''), p.name),
      'image', coalesce(nullif(i->>'image',''), p.image_url),
      'url',   coalesce(nullif(i->>'url',''), p.product_url)
    ) order by t.n), '[]'::jsonb)
  from jsonb_array_elements(case when jsonb_typeof(p_items) = 'array' then p_items else '[]'::jsonb end)
       with ordinality as t(i, n)
  left join lateral (
    select pr.name, pr.image_url, pr.product_url from public.products pr
    where pr.store_id = p_store_id
      and pr.external_id::text = coalesce(nullif(t.i->>'product_id',''), nullif(t.i->>'id',''))
    limit 1
  ) p on true
$$;
revoke all on function public.review_items_enrich(uuid, jsonb) from public;

create or replace function public.review_requests_enrich_trg()
returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  new.items := public.review_items_enrich(new.store_id, new.items);
  return new;
end $$;
drop trigger if exists review_requests_enrich on public.review_requests;
create trigger review_requests_enrich before insert or update of items on public.review_requests
  for each row execute function public.review_requests_enrich_trg();

-- refs da avaliacao: id do produto + slug da URL (casa com a pagina do produto)
create or replace function public.reviews_refs_trg()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  if new.order_id is not null and jsonb_typeof(new.purchased) = 'array' then
    new.product_refs := (
      select coalesce(array_agg(distinct s.r) filter (where s.r is not null and s.r <> ''), '{}'::text[])
      from (
        select lower(x) as r from unnest(coalesce(new.product_refs, '{}'::text[])) x
        union all select lower(i->>'product_id') from jsonb_array_elements(new.purchased) i
        union all select lower(regexp_replace(split_part(split_part(i->>'url','?',1),'#',1), '^.*/([^/]+)/?$', '\1'))
                  from jsonb_array_elements(new.purchased) i where coalesce(i->>'url','') <> ''
      ) s(r));
  end if;
  return new;
end $$;
drop trigger if exists reviews_refs on public.reviews;
create trigger reviews_refs before insert on public.reviews
  for each row execute function public.reviews_refs_trg();

-- pagina /avaliar/:token agora devolve store_id (necessario para o upload)
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
  return jsonb_build_object('ok', true, 'store_id', r.store_id,
    'store', jsonb_build_object('name', coalesce(nullif(st.reply_display_name,''), st.name), 'logo', st.logo_url, 'url', st.url),
    'customer', initcap(split_part(trim(coalesce(r.customer_name,'')), ' ', 1)),
    'items', public.review_items_public(r.items),
    'allow_media', coalesce(s.invite_allow_media, true));
end $fn$;
revoke all on function public.review_request_get(text) from public;
grant execute on function public.review_request_get(text) to anon, authenticated;

-- reprocessa pedidos ja agendados (dispara o enriquecimento)
update public.review_requests set items = items;

notify pgrst, 'reload schema';
commit;