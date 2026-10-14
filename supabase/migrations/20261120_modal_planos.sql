alter table public.hub_modules add column if not exists modal_description text;
alter table public.dynamic_plans add column if not exists modal_highlights jsonb not null default '[]'::jsonb;