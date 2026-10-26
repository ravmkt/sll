create or replace function live_commerce.live_preset_metrics(p_store uuid)
returns table (preset_id uuid, lives_count integer, uses integer, views integer, clicks integer)
language sql
stable
security invoker
set search_path = live_commerce, public
as $$
  with pr as (
    select id, kind, upper(btrim(title)) as t
    from live_commerce.live_presets
    where store_id = p_store
  ),
  lk as (
    select pr.id as pid, l.id as lid,
      case when pr.kind = 'coupon' then
        coalesce((select sum(c.used_count) from live_commerce.live_coupons c
                  where c.live_id = l.id and upper(btrim(c.code)) = pr.t), 0)
      else 0 end as used
    from pr
    join live_commerce.lives l on l.store_id = p_store
    where (pr.kind = 'coupon' and exists (
            select 1 from live_commerce.live_coupons c
            where c.live_id = l.id and upper(btrim(c.code)) = pr.t))
       or (pr.kind = 'advantage' and exists (
            select 1 from jsonb_array_elements(
              case when jsonb_typeof(l.advantages::jsonb) = 'array' then l.advantages::jsonb else '[]'::jsonb end
            ) a where upper(btrim(a->>'title')) = pr.t))
  ),
  ev as (
    select e.live_id,
      count(*) filter (where e.event_type = 'view') as v,
      count(*) filter (where e.event_type = 'product_click') as k
    from live_commerce.live_events e
    where e.live_id in (select lid from lk)
    group by e.live_id
  )
  select pr.id,
         count(lk.lid)::int,
         coalesce(sum(lk.used), 0)::int,
         coalesce(sum(ev.v), 0)::int,
         coalesce(sum(ev.k), 0)::int
  from pr
  left join lk on lk.pid = pr.id
  left join ev on ev.live_id = lk.lid
  group by pr.id;
$$;

grant execute on function live_commerce.live_preset_metrics(uuid) to authenticated;