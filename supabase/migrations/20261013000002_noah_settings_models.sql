create table if not exists public.noah_settings (
  id int primary key default 1 check (id = 1),
  ai_enabled boolean not null default true,
  model text not null default 'gemini-3.1-flash-lite',
  whatsapp_number text not null default '5545998370536',
  whatsapp_message text not null default 'Olá! Sou da loja {loja} (ID: {id}) e preciso de ajuda no SLL Hub.',
  usd_brl numeric not null default 5.5,
  updated_at timestamptz not null default now()
);
insert into public.noah_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.noah_models (
  model text primary key,
  label text,
  input_usd numeric not null default 0,
  output_usd numeric not null default 0,
  price_checked_at timestamptz,
  created_at timestamptz not null default now()
);
insert into public.noah_models (model, label, input_usd, output_usd, price_checked_at) values
  ('gemini-3.1-flash-lite', 'Gemini 3.1 Flash-Lite', 0.25, 1.50, now())
on conflict (model) do nothing;
insert into public.noah_models (model, label, input_usd, output_usd) values
  ('gemini-2.5-flash-lite', 'Gemini 2.5 Flash-Lite', 0.10, 0.40),
  ('gemini-3-flash-preview', 'Gemini 3 Flash (preview)', 0.50, 3.00),
  ('gemini-2.5-flash', 'Gemini 2.5 Flash', 0.30, 2.50)
on conflict (model) do nothing;

alter table public.noah_settings enable row level security;
alter table public.noah_models enable row level security;

drop policy if exists noah_settings_master on public.noah_settings;
create policy noah_settings_master on public.noah_settings
  for all to authenticated using (public.noah_is_master()) with check (public.noah_is_master());
drop policy if exists noah_models_master on public.noah_models;
create policy noah_models_master on public.noah_models
  for all to authenticated using (public.noah_is_master()) with check (public.noah_is_master());

create or replace function public.noah_public_config()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object('ai_enabled', ai_enabled, 'whatsapp_number', whatsapp_number, 'whatsapp_message', whatsapp_message)
  from public.noah_settings where id = 1
$$;
grant execute on function public.noah_public_config() to authenticated;

drop function if exists public.admin_noah_metrics(timestamptz);
create or replace function public.admin_noah_metrics(p_from timestamptz, p_to timestamptz)
returns table (model text, questions bigint, prompt_tokens bigint, completion_tokens bigint, total_tokens bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.noah_is_master() then raise exception 'FORBIDDEN'; end if;
  return query
    select coalesce(l.model, 'desconhecido'), count(*)::bigint,
           coalesce(sum(l.prompt_tokens), 0)::bigint,
           coalesce(sum(l.completion_tokens), 0)::bigint,
           coalesce(sum(l.total_tokens), 0)::bigint
    from public.noah_logs l
    where l.created_at >= p_from and l.created_at < p_to
    group by 1
    order by 2 desc;
end $$;
grant execute on function public.admin_noah_metrics(timestamptz, timestamptz) to authenticated;

create or replace function public.admin_noah_metrics_by_store(p_from timestamptz, p_to timestamptz)
returns table (store_id uuid, store_name text, model text, questions bigint, prompt_tokens bigint, completion_tokens bigint, total_tokens bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.noah_is_master() then raise exception 'FORBIDDEN'; end if;
  return query
    select l.store_id, s.name::text, coalesce(l.model, 'desconhecido'), count(*)::bigint,
           coalesce(sum(l.prompt_tokens), 0)::bigint,
           coalesce(sum(l.completion_tokens), 0)::bigint,
           coalesce(sum(l.total_tokens), 0)::bigint
    from public.noah_logs l
    left join public.stores s on s.id = l.store_id
    where l.created_at >= p_from and l.created_at < p_to
    group by 1, 2, 3
    order by 4 desc;
end $$;
grant execute on function public.admin_noah_metrics_by_store(timestamptz, timestamptz) to authenticated;

select (select count(*) from public.noah_settings) as settings, (select count(*) from public.noah_models) as models;