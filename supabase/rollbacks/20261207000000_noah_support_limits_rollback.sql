begin;
drop table if exists noah.support_cooldowns;
alter table public.admin_ai_settings drop column if exists burst_limit, drop column if exists cooldown_minutes;
notify pgrst, 'reload schema';
commit;