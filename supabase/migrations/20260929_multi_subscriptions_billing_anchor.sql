-- Ancora de vencimento unificado por loja
alter table public.stores
  add column if not exists billing_anchor_day integer check (billing_anchor_day between 1 and 28);

-- Enriquecimento das assinaturas: módulo de referência + suporte a prorata
alter table public.subscriptions
  add column if not exists module_key text,
  add column if not exists is_prorated boolean default false,
  add column if not exists prorated_amount_cents integer,
  add column if not exists prorated_until date;

comment on column public.subscriptions.module_key is 'Chave do módulo coberto (vidlytics, live_commerce, gamification...) ou "bundle" se o plano cobrir mais de 1 módulo';

-- Backfill do module_key com base no plano vinculado
update public.subscriptions s
set module_key = sub.mk
from (
  select
    p.id as plan_id,
    case
      when jsonb_array_length(coalesce(p.modules, '[]'::jsonb)) > 1 then 'bundle'
      when jsonb_array_length(coalesce(p.modules, '[]'::jsonb)) = 1 then p.modules->>0
      else 'unknown'
    end as mk
  from public.plans p
) sub
where s.plan_id = sub.plan_id
  and s.module_key is null;

-- Define a ancora de vencimento das lojas que já têm assinatura ativa, usando o dia do primeiro período existente
update public.stores st
set billing_anchor_day = extract(day from sub.current_period_end)::int
from (
  select store_id, min(current_period_end) as current_period_end
  from public.subscriptions
  where is_current = true and current_period_end is not null
  group by store_id
) sub
where st.id = sub.store_id
  and st.billing_anchor_day is null;

-- Índice para consultas por loja + status (usado na agregação de módulos liberados)
create index if not exists idx_subscriptions_store_status
  on public.subscriptions (store_id, status);
