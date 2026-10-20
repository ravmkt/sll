alter table public.infrastructure_cost_settings add column if not exists ai_cost_brl_per_message numeric not null default 0;
