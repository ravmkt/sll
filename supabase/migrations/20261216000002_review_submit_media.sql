update storage.buckets
set file_size_limit = 52428800,
    allowed_mime_types = array['image/webp','image/jpeg','video/mp4','video/webm']
where id = 'reviews';

drop policy if exists reviews_public_submit_upload on storage.objects;
create policy reviews_public_submit_upload on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'reviews'
    and name ~ '^submissions/[0-9a-f-]{36}/[0-9a-f-]{8,40}\.(webp|jpg|mp4|webm)$');

create or replace function public.review_submit(p_store_id uuid, p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $fn$
declare
  x jsonb := coalesce(p_data, '{}'::jsonb);
  v_rating int;
  v_name text := left(trim(coalesce(x->>'author_name','')), 80);
  v_email text := lower(left(trim(coalesce(x->>'author_email','')), 120));
  v_title text := left(trim(coalesce(x->>'title','')), 120);
  v_body text := left(trim(coalesce(x->>'body','')), 2000);
  v_ref text := nullif(replace(left(trim(coalesce(x->>'product_ref','')), 120), '*', ''), '');
  v_pname text := nullif(left(trim(coalesce(x->>'product_name','')), 200), '');
  v_media jsonb := case when jsonb_typeof(x->'media') = 'array' then x->'media' else '[]'::jsonb end;
  v_pre text := 'https://flivmllysdhaydhogmhg.supabase.co/storage/v1/object/public/reviews/';
  v_pfx text := v_pre || 'submissions/' || p_store_id::text || '/';
  v_id uuid; e jsonb; v_vid int := 0;
begin
  if p_store_id is null then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  begin v_rating := (x->>'rating')::int; exception when others then v_rating := null; end;
  if v_rating is null or v_rating not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if length(v_name) < 2 or length(v_body) < 5
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;
  if jsonb_array_length(v_media) > 3 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;

  if not exists (select 1 from pulse.review_widgets w
                 where w.store_id = p_store_id and w.active and w.design->>'allow_submit' = 'true') then
    return jsonb_build_object('ok', false, 'error', 'disabled');
  end if;

  if jsonb_array_length(v_media) > 0 then
    if not exists (select 1 from pulse.review_widgets w
                   where w.store_id = p_store_id and w.active and w.design->>'allow_submit' = 'true'
                     and coalesce(w.design->>'allow_media', 'true') <> 'false') then
      return jsonb_build_object('ok', false, 'error', 'disabled');
    end if;
    for e in select m from jsonb_array_elements(v_media) m loop
      if coalesce(e->>'kind','') not in ('image','video')
         or left(coalesce(e->>'url',''), length(v_pfx)) <> v_pfx
         or not exists (select 1 from storage.objects o
                        where o.bucket_id = 'reviews' and o.name = substr(e->>'url', length(v_pre) + 1))
         or (nullif(e->>'poster_url','') is not null and (
               left(e->>'poster_url', length(v_pfx)) <> v_pfx
               or not exists (select 1 from storage.objects o
                              where o.bucket_id = 'reviews' and o.name = substr(e->>'poster_url', length(v_pre) + 1))))
      then
        return jsonb_build_object('ok', false, 'error', 'invalid');
      end if;
      if e->>'kind' = 'video' then v_vid := v_vid + 1; end if;
    end loop;
    if v_vid > 1 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  end if;

  if exists (select 1 from public.reviews r
             where r.store_id = p_store_id and r.source = 'store' and r.author_email = v_email
               and r.product_ref is not distinct from v_ref and r.created_at > now() - interval '30 days') then
    return jsonb_build_object('ok', false, 'error', 'duplicate');
  end if;

  if (select count(*) from public.reviews r where r.store_id = p_store_id and r.source = 'store'
        and r.status = 'pending' and r.created_at > now() - interval '1 hour') >= 20
     or (select count(*) from public.reviews r where r.store_id = p_store_id and r.author_email = v_email
        and r.created_at > now() - interval '1 hour') >= 5 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.reviews(store_id, source, product_ref, product_name, author_name, author_email,
                             rating, title, body, review_date, verified, status)
  values (p_store_id, 'store', v_ref, v_pname, v_name, v_email, v_rating, v_title, v_body, now(), false, 'pending')
  returning id into v_id;

  if jsonb_array_length(v_media) > 0 then
    insert into public.review_media(review_id, store_id, kind, url, poster_url)
    select v_id, p_store_id, m->>'kind', m->>'url', nullif(m->>'poster_url','')
    from jsonb_array_elements(v_media) m;
  end if;
  return jsonb_build_object('ok', true);
end $fn$;

revoke all on function public.review_submit(uuid, jsonb) from public;
grant execute on function public.review_submit(uuid, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';