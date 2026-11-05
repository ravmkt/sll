update public.plans
set name = regexp_replace(name, 'Live Commerce', 'Stream Sell', 'gi')
where name ilike '%live commerce%';