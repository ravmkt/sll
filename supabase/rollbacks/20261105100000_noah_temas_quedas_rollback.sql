drop function if exists public.admin_noah_themes(integer, date, date);
drop function if exists public.noah_log_support_event(uuid, text);
drop table if exists public.noah_support_events;
notify pgrst, 'reload schema';