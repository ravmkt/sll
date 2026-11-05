begin;

alter table public.admin_ai_settings
  add column if not exists daily_limit_per_store integer,
  add column if not exists burst_limit integer,
  add column if not exists cooldown_minutes integer;

update public.admin_ai_settings set daily_limit_per_store = 150
  where purpose = 'support' and (daily_limit_per_store is null or daily_limit_per_store = 30);
update public.admin_ai_settings set burst_limit = 15
  where purpose = 'support' and burst_limit is null;
update public.admin_ai_settings set cooldown_minutes = 2
  where purpose = 'support' and cooldown_minutes is null;

-- Respiro ativo por loja (a contagem de rajada recomeca depois que ele termina)
create table if not exists noah.support_cooldowns (
  store_id uuid primary key,
  until timestamptz not null
);
alter table noah.support_cooldowns enable row level security;
grant all on noah.support_cooldowns to service_role;

notify pgrst, 'reload schema';
commit;

select purpose, daily_limit_per_store, burst_limit, cooldown_minutes
from public.admin_ai_settings where purpose = 'support';