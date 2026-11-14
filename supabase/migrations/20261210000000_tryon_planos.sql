-- F-Planos Try-On: trial por módulo, planos e função de entitlement

alter table public.dynamic_plans add column if not exists trial_days integer not null default 0;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;

insert into public.dynamic_plans
  (module_slug, plan_tier, plan_name, is_combo, price_monthly_cents, price_semiannual_cents, price_annual_cents,
   limits_config, is_recommended, sort_order, is_active, discount_pct, modal_highlights, features, trial_days)
select v.* from (values
  ('tryon','starter','Try-On Starter',false,9700,48500,97000,
   '{"generations_month":100,"max_products":50,"storefront_mode":false}'::jsonb,false,1,true,0::numeric,'[]'::jsonb,
   '["100 provas virtuais por mês","Até 50 produtos habilitados","Provador por produto","Instalação via GTM ou Yampi"]'::jsonb,7),
  ('tryon','pro','Try-On Pro',false,24700,123500,247000,
   '{"generations_month":400,"max_products":300,"storefront_mode":true}'::jsonb,true,2,true,0::numeric,'[]'::jsonb,
   '["400 provas virtuais por mês","Até 300 produtos habilitados","Vitrine Personalizada","Analytics de provas e conversão"]'::jsonb,7),
  ('tryon','scale','Try-On Scale',false,59700,298500,597000,
   '{"generations_month":1000,"max_products":-1,"storefront_mode":true}'::jsonb,false,3,true,0::numeric,'[]'::jsonb,
   '["1.000 provas virtuais por mês","Produtos ilimitados","Vitrine Personalizada","Suporte prioritário"]'::jsonb,7)
) as v(module_slug, plan_tier, plan_name, is_combo, price_monthly_cents, price_semiannual_cents, price_annual_cents,
       limits_config, is_recommended, sort_order, is_active, discount_pct, modal_highlights, features, trial_days)
where not exists (
  select 1 from public.dynamic_plans d where d.module_slug = v.module_slug and d.plan_tier = v.plan_tier
);

create or replace function tryon.entitlement(p_store uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, tryon
as $$
  select coalesce(
    (select jsonb_build_object(
        'plan_tier', dp.plan_tier,
        'status', s.status,
        'trial_ends_at', s.trial_ends_at,
        'active', (s.status = 'active'
                   or (s.status = 'trialing' and coalesce(s.trial_ends_at, now()) > now())),
        'limits', dp.limits_config)
     from public.subscriptions s
     join public.dynamic_plans dp on dp.id = s.dynamic_plan_id
     where s.store_id = p_store and s.module_key = 'tryon' and s.is_current
     order by s.created_at desc
     limit 1),
    jsonb_build_object('active', false));
$$;

revoke all on function tryon.entitlement(uuid) from public, anon, authenticated;
grant execute on function tryon.entitlement(uuid) to service_role;
