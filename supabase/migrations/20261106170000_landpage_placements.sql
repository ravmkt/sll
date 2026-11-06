-- páginas de venda
create table if not exists public.landing_pages (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  is_published boolean not null default true,
  config       jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);
-- onde cada plano/combo aparece (plan_id e module_slug sem FK, para não depender do tipo da PK)
create table if not exists public.landing_page_plans (
  landing_id uuid not null references public.landing_pages(id) on delete cascade,
  plan_id    text not null,
  primary key (landing_id, plan_id)
);
-- onde cada módulo aparece (cards)
create table if not exists public.landing_page_modules (
  landing_id  uuid not null references public.landing_pages(id) on delete cascade,
  module_slug text not null,
  primary key (landing_id, module_slug)
);

do $$
declare t text;
begin
  foreach t in array array['landing_pages','landing_page_plans','landing_page_modules'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_superadmin_all', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.is_superadmin()) with check (public.is_superadmin())', t || '_superadmin_all', t);
  end loop;
end $$;

insert into public.landing_pages (slug, name) values
  ('sll-hub','Landing SLL Hub'),
  ('vidlytics','Landing Vidlytics'),
  ('stream-sell','Landing Stream Sell')
on conflict (slug) do nothing;

-- seed: a landing atual continua exibindo tudo que já está ativo
insert into public.landing_page_plans (landing_id, plan_id)
select l.id, p.id::text from public.landing_pages l, public.dynamic_plans p
where l.slug = 'sll-hub' and p.is_active
on conflict do nothing;

insert into public.landing_page_modules (landing_id, module_slug)
select l.id, m.slug from public.landing_pages l, public.hub_modules m
where l.slug = 'sll-hub'
on conflict do nothing;

-- leitura pública: só planos ativos E vinculados à página, sem custos/margens
create or replace function public.landing_public_data(p_slug text default 'sll-hub')
returns jsonb language sql stable security definer set search_path = public as $fn$
  with lp as (select * from public.landing_pages where slug = p_slug and is_published),
  pl as (
    select p.* from public.dynamic_plans p
    where p.is_active and exists (
      select 1 from public.landing_page_plans x join lp on lp.id = x.landing_id where x.plan_id = p.id::text)
  )
  select jsonb_build_object(
    'config', coalesce((select config from lp), '{}'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'module_slug', p.module_slug, 'plan_tier', p.plan_tier, 'plan_name', p.plan_name,
        'is_combo', p.is_combo, 'price_monthly_cents', p.price_monthly_cents,
        'price_semiannual_cents', p.price_semiannual_cents, 'price_annual_cents', p.price_annual_cents,
        'limits_config', p.limits_config, 'is_recommended', p.is_recommended, 'sort_order', p.sort_order
      ) order by p.sort_order) from pl p), '[]'::jsonb),
    'combo_modules', coalesce((select jsonb_agg(jsonb_build_object(
        'plan_id', c.plan_id, 'module_slug', c.module_slug, 'member_tier', c.member_tier))
        from public.combo_modules c join pl p on p.id = c.plan_id), '[]'::jsonb),
    'modules', coalesce((select jsonb_agg(jsonb_build_object('slug', m.slug, 'name', m.name) order by m.sort_order)
        from public.hub_modules m), '[]'::jsonb),
    'module_slugs', coalesce((select jsonb_agg(x.module_slug)
        from public.landing_page_modules x join lp on lp.id = x.landing_id), '[]'::jsonb)
  );
$fn$;
grant execute on function public.landing_public_data(text) to anon, authenticated;

notify pgrst, 'reload schema';

-- verificação: deve retornar páginas = 3 e planos_na_landing > 0
select
  (select count(*) from public.landing_pages) as paginas,
  (select count(*) from public.landing_page_plans) as vinculos_planos,
  jsonb_array_length(public.landing_public_data('sll-hub') -> 'plans') as planos_na_landing;
