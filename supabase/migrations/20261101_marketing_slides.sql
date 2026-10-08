alter table public.marketing_items add column if not exists slides jsonb not null default '[]'::jsonb;

create or replace function public.admin_marketing_save(p_id uuid, p_data jsonb)
returns uuid language plpgsql security definer set search_path to 'public' as $function$
declare
  v_id uuid;
  v_slides jsonb := case when jsonb_typeof(p_data->'slides') = 'array' then p_data->'slides' else '[]'::jsonb end;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if coalesce(trim(p_data->>'title'), '') = '' then raise exception 'title_required'; end if;

  if p_id is null then
    insert into public.marketing_items
      (kind, title, body, image_url, cta_label, cta_url, coupon_code, location, audience, frequency, starts_at, ends_at, is_active, slides)
    values (
      p_data->>'kind', trim(p_data->>'title'), nullif(p_data->>'body',''), nullif(p_data->>'image_url',''),
      nullif(p_data->>'cta_label',''), nullif(p_data->>'cta_url',''), nullif(upper(trim(p_data->>'coupon_code')),''),
      coalesce(p_data->>'location','all'), coalesce(p_data->>'audience','all'), coalesce(p_data->>'frequency','always'),
      nullif(p_data->>'starts_at','')::timestamptz, nullif(p_data->>'ends_at','')::timestamptz,
      coalesce((p_data->>'is_active')::boolean, true), v_slides
    ) returning id into v_id;
  else
    update public.marketing_items set
      title = trim(p_data->>'title'), body = nullif(p_data->>'body',''), image_url = nullif(p_data->>'image_url',''),
      cta_label = nullif(p_data->>'cta_label',''), cta_url = nullif(p_data->>'cta_url',''),
      coupon_code = nullif(upper(trim(p_data->>'coupon_code')),''),
      location = coalesce(p_data->>'location','all'), audience = coalesce(p_data->>'audience','all'),
      frequency = coalesce(p_data->>'frequency','always'),
      starts_at = nullif(p_data->>'starts_at','')::timestamptz, ends_at = nullif(p_data->>'ends_at','')::timestamptz,
      is_active = coalesce((p_data->>'is_active')::boolean, true), slides = v_slides, updated_at = now()
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
  end if;

  insert into public.admin_audit_logs (admin_id, action, details)
  values (auth.uid(), case when p_id is null then 'marketing_create' else 'marketing_update' end,
          jsonb_build_object('item_id', v_id, 'kind', p_data->>'kind', 'title', p_data->>'title'));
  return v_id;
end $function$;

create or replace function public.marketing_active_for_me(p_store_id uuid, p_location text)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_past timestamptz; v_trial timestamptz;
begin
  if p_store_id is null or not public.is_store_owner_or_member(p_store_id) then return '[]'::jsonb; end if;
  select s.past_due_since, s.trial_ends_at into v_past, v_trial from public.stores s where s.id = p_store_id;
  return coalesce((
    select jsonb_agg(x.o order by x.created_at desc, x.ord)
    from (
      select i.created_at, s.ord,
        jsonb_build_object(
          'id', i.id, 'kind', i.kind, 'slide', s.ord, 'title', i.title, 'body', i.body, 'image_url', s.img,
          'cta_label', i.cta_label, 'cta_url', i.cta_url, 'coupon_code', i.coupon_code, 'frequency', i.frequency
        ) as o
      from public.marketing_items i
      cross join lateral (
        select 0::bigint as ord, i.image_url as img
         where jsonb_array_length(coalesce(i.slides, '[]'::jsonb)) = 0
        union all
        select e.ord, e.s->>'image_url'
          from jsonb_array_elements(coalesce(i.slides, '[]'::jsonb)) with ordinality as e(s, ord)
         where coalesce(e.s->>'image_url', '') <> ''
           and (nullif(e.s->>'starts_at', '') is null or (e.s->>'starts_at')::timestamptz <= now())
           and (nullif(e.s->>'ends_at', '') is null or (e.s->>'ends_at')::timestamptz >= now())
      ) s
      where i.is_active
        and (i.starts_at is null or i.starts_at <= now())
        and (i.ends_at is null or i.ends_at >= now())
        and i.location in ('all', p_location)
        and (i.audience = 'all'
             or (i.audience = 'past_due' and v_past is not null)
             or (i.audience = 'trial' and v_trial is not null and v_trial > now()))
    ) x
  ), '[]'::jsonb);
end $function$;

select column_name from information_schema.columns where table_name = 'marketing_items' and column_name = 'slides';