begin;

create schema if not exists noah;
grant usage on schema noah to service_role, authenticated;

-- Log unificado de uso de IA (todas as finalidades)
create table if not exists noah.usage_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid,
  purpose text not null,
  model text not null,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  cost_usd numeric(14,8) not null default 0,
  cost_brl numeric(14,6) not null default 0,
  usd_brl numeric(10,4),
  source text,
  legacy_log_id uuid unique,
  created_at timestamptz not null default now()
);
create index if not exists usage_log_purpose_idx on noah.usage_log (purpose, created_at desc);
create index if not exists usage_log_store_idx on noah.usage_log (store_id, created_at desc);

alter table noah.usage_log enable row level security;
drop policy if exists usage_log_superadmin_select on noah.usage_log;
create policy usage_log_superadmin_select on noah.usage_log
  for select to authenticated using (public.is_superadmin());
grant select on noah.usage_log to authenticated;
grant all on noah.usage_log to service_role;

-- Registra uso e calcula custo (preco por 1 milhao de tokens x cotacao do dia)
create or replace function noah.log_usage(
  p_store_id uuid, p_purpose text, p_model text,
  p_prompt integer, p_completion integer, p_source text default null
) returns void
language plpgsql
security definer
set search_path = noah, public
as $$
declare
  v_in numeric; v_out numeric; v_fx numeric; v_usd numeric;
begin
  select input_usd, output_usd into v_in, v_out from public.noah_models where model = p_model;
  select usd_brl into v_fx from public.noah_settings where id = 1;
  v_usd := (coalesce(p_prompt,0) * coalesce(v_in,0) + coalesce(p_completion,0) * coalesce(v_out,0)) / 1000000.0;
  insert into noah.usage_log (store_id, purpose, model, prompt_tokens, completion_tokens, total_tokens,
                              cost_usd, cost_brl, usd_brl, source)
  values (p_store_id, p_purpose, p_model, coalesce(p_prompt,0), coalesce(p_completion,0),
          coalesce(p_prompt,0) + coalesce(p_completion,0),
          v_usd, v_usd * coalesce(v_fx,0), v_fx, p_source);
end $$;
revoke all on function noah.log_usage(uuid, text, text, integer, integer, text) from public, anon, authenticated;
grant execute on function noah.log_usage(uuid, text, text, integer, integer, text) to service_role;

-- Resumo para a aba IA do Master (so superadmin)
create or replace function noah.admin_usage_summary(p_from timestamptz, p_to timestamptz)
returns table (purpose text, store_id uuid, calls bigint, tokens bigint, cost_usd numeric, cost_brl numeric)
language plpgsql
stable
security definer
set search_path = noah, public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return query
    select u.purpose, u.store_id, count(*), coalesce(sum(u.total_tokens), 0)::bigint,
           coalesce(sum(u.cost_usd), 0), coalesce(sum(u.cost_brl), 0)
    from noah.usage_log u
    where u.created_at >= p_from and u.created_at < p_to
    group by u.purpose, u.store_id
    order by 6 desc;
end $$;
revoke all on function noah.admin_usage_summary(timestamptz, timestamptz) from public, anon;
grant execute on function noah.admin_usage_summary(timestamptz, timestamptz) to authenticated, service_role;

-- Historico do suporte vira purpose 'support' (idempotente)
insert into noah.usage_log (store_id, purpose, model, prompt_tokens, completion_tokens, total_tokens,
                            cost_usd, cost_brl, usd_brl, source, legacy_log_id, created_at)
select l.store_id, 'support', l.model,
       coalesce(l.prompt_tokens,0), coalesce(l.completion_tokens,0), coalesce(l.total_tokens,0),
       c.usd, c.usd * coalesce(s.usd_brl,0), s.usd_brl, 'legacy', l.id, l.created_at
from public.noah_logs l
left join public.noah_models m on m.model = l.model
left join public.noah_settings s on s.id = 1
cross join lateral (
  select (coalesce(l.prompt_tokens,0) * coalesce(m.input_usd,0)
        + coalesce(l.completion_tokens,0) * coalesce(m.output_usd,0)) / 1000000.0 as usd
) c
on conflict (legacy_log_id) do nothing;

-- Finalidades novas (desligadas ate o codigo existir)
do $$
begin
  insert into public.admin_ai_settings (purpose, provider, model, fallback_model, use_web_search, enabled)
  select v.p, 'gemini', 'gemini-3.1-flash-lite', null, false, false
  from (values ('support'), ('insights'), ('feedback')) as v(p)
  where not exists (select 1 from public.admin_ai_settings a where a.purpose = v.p);
exception when others then
  raise notice 'Seed de admin_ai_settings ignorado: %', sqlerrm;
end $$;

notify pgrst, 'reload schema';
commit;

-- CONFERENCIA 1: preco por 1M tokens (flash-lite costuma ser ~0.10 entrada / ~0.40 saida)
select model, input_usd, output_usd, price_checked_at from public.noah_models;
-- CONFERENCIA 2: historico importado com custo
select purpose, model, count(*) chamadas, sum(total_tokens) tokens, round(sum(cost_brl)::numeric, 4) custo_brl
from noah.usage_log group by 1, 2;
-- CONFERENCIA 3: finalidades
select purpose, model, enabled from public.admin_ai_settings order by 1;