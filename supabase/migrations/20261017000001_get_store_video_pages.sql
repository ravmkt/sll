create or replace function public.get_store_video_pages(p_store_id uuid)
returns json
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare
  v_pages integer;
  v_limit integer;
begin
  if not public.is_store_owner_or_member(p_store_id) then
    return json_build_object('pages', 0, 'limit', null);
  end if;

  select count(distinct y.pg) into v_pages
  from (
    select case
             when x.src = '' then null
             else coalesce(nullif(regexp_replace(
                    regexp_replace(regexp_replace(x.src, '^https?://[^/]+', ''), '[?#].*$', ''),
                    '(.)/+$', '\1'), ''), '/')
           end as pg
    from (
      select coalesce(to_jsonb(e)->>'page_path', to_jsonb(e)->>'page_url', '') as src
      from public.store_activity_events e
      where e.store_id::text = p_store_id::text
        and e.event_type = 'video_view'
        and e.created_at > now() - interval '90 days'
    ) x
  ) y
  where y.pg is not null;

  select nullif(to_jsonb(p)->>'pages_limit', '')::integer into v_limit
  from public.subscriptions s
  join public.plans p on p.id = s.plan_id
  where s.store_id::text = p_store_id::text
    and s.is_current = true
  order by (s.module_key = 'vidlytics') desc nulls last, s.created_at desc
  limit 1;

  return json_build_object('pages', coalesce(v_pages, 0), 'limit', v_limit);
end;
$function$;

revoke all on function public.get_store_video_pages(uuid) from public, anon;
grant execute on function public.get_store_video_pages(uuid) to authenticated;

-- TESTE (rode separado, com o usuario logado no painel nao funciona no editor; use como conferencia manual):
-- select count(distinct coalesce(to_jsonb(e)->>'page_path', to_jsonb(e)->>'page_url')) from public.store_activity_events e
-- where e.store_id::text = 'c1911fc6-ec70-4be1-9ec1-0443fbfb7632' and e.event_type = 'video_view';