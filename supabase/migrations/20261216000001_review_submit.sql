alter table public.reviews add column if not exists author_email text;
create index if not exists reviews_submit_rl_idx on public.reviews (store_id, source, created_at desc);

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
begin
  if p_store_id is null then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  begin v_rating := (x->>'rating')::int; exception when others then v_rating := null; end;
  if v_rating is null or v_rating not between 1 and 5 then return jsonb_build_object('ok', false, 'error', 'invalid'); end if;
  if length(v_name) < 2 or length(v_body) < 5
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid');
  end if;

  if not exists (select 1 from pulse.review_widgets w
                 where w.store_id = p_store_id and w.active and w.design->>'allow_submit' = 'true') then
    return jsonb_build_object('ok', false, 'error', 'disabled');
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
  values (p_store_id, 'store', v_ref, v_pname, v_name, v_email, v_rating, v_title, v_body, now(), false, 'pending');
  return jsonb_build_object('ok', true);
end $fn$;

revoke all on function public.review_submit(uuid, jsonb) from public;
grant execute on function public.review_submit(uuid, jsonb) to anon, authenticated;
notify pgrst, 'reload schema';