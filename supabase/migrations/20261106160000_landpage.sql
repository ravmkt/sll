create table if not exists public.landing_pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  is_published boolean not null default true,
  config       jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);
alter table public.landing_pages enable row level security;
grant select, insert, update, delete on public.landing_pages to authenticated;
drop policy if exists landing_superadmin_all on public.landing_pages;
create policy landing_superadmin_all on public.landing_pages for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

insert into public.landing_pages (slug, name, config) values
  ('sll-hub','Landing SLL Hub','{}'::jsonb),
  ('vidlytics','Landing Vidlytics','{}'::jsonb),
  ('stream-sell','Landing Stream Sell','{}'::jsonb)
on conflict (slug) do nothing;

-- Leitura publica controlada: so planos ativos e colunas seguras (sem custos/margens)
create or replace function public.landing_public_data(p_slug text default 'sll-hub')
returns jsonb language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object(
    'config', coalesce((select l.config from public.landing_pages l where l.slug = p_slug and l.is_published), '{}'::jsonb),
    'plans', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id, 'module_slug', p.module_slug, 'plan_tier', p.plan_tier, 'plan_name', p.plan_name,
        'is_combo', p.is_combo, 'price_monthly_cents', p.price_monthly_cents,
        'price_semiannual_cents', p.price_semiannual_cents, 'price_annual_cents', p.price_annual_cents,
        'limits_config', p.limits_config, 'is_recommended', p.is_recommended, 'sort_order', p.sort_order
      ) order by p.sort_order)
      from public.dynamic_plans p where p.is_active), '[]'::jsonb),
    'combo_modules', coalesce((
      select jsonb_agg(jsonb_build_object('plan_id', c.plan_id, 'module_slug', c.module_slug, 'member_tier', c.member_tier))
      from public.combo_modules c join public.dynamic_plans p on p.id = c.plan_id where p.is_active), '[]'::jsonb),
    'modules', coalesce((
      select jsonb_agg(jsonb_build_object('slug', m.slug, 'name', m.name) order by m.sort_order)
      from public.hub_modules m), '[]'::jsonb)
  );
$fn$;
grant execute on function public.landing_public_data(text) to anon, authenticated;

notify pgrst, 'reload schema';
