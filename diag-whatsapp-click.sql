select conname, pg_get_constraintdef(oid) as def
from pg_constraint
where conrelid = 'live_commerce.live_events'::regclass and contype = 'c';

select event_type, count(*), max(created_at)
from live_commerce.live_events
where event_type in ('whatsapp_click','group_click','signup_click')
group by 1;