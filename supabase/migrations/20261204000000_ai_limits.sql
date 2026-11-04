alter table public.admin_ai_settings
  add column if not exists daily_limit_per_store integer,
  add column if not exists interval_days integer;

update public.admin_ai_settings set daily_limit_per_store = 30
  where purpose = 'support' and daily_limit_per_store is null;
update public.admin_ai_settings set interval_days = 3
  where purpose = 'insights' and interval_days is null;

notify pgrst, 'reload schema';

select purpose, daily_limit_per_store, interval_days from public.admin_ai_settings order by 1;