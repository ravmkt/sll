-- ===== Super admin =====
create table if not exists public.admin_superusers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create or replace function public.is_superadmin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.admin_superusers s
    where to_jsonb(s)->>'user_id' = auth.uid()::text
       or to_jsonb(s)->>'id' = auth.uid()::text
  );
exception when undefined_table then
  return false;
end;
$$;
grant execute on function public.is_superadmin() to authenticated;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ===== Modulos e feature flags =====
create table if not exists public.hub_modules (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  status text not null default 'coming_soon' check (status in ('active','coming_soon','maintenance')),
  is_public_for_sale boolean not null default false,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_hub_modules_updated on public.hub_modules;
create trigger trg_hub_modules_updated before update on public.hub_modules
  for each row execute function public.set_updated_at();

insert into public.hub_modules (slug, name, status, is_public_for_sale, sort_order) values
  ('vidlytics',     'Vidlytics',     'active',      true,  1),
  ('live_commerce', 'Live Commerce', 'coming_soon', false, 2)
on conflict (slug) do nothing;

-- ===== Planos dinamicos, combos e add-ons =====
create table if not exists public.dynamic_plans (
  id uuid primary key default gen_random_uuid(),
  module_slug text references public.hub_modules(slug),
  plan_tier text not null,
  plan_name text not null,
  is_combo boolean not null default false,
  price_monthly_cents int not null check (price_monthly_cents >= 0),
  price_semiannual_cents int not null check (price_semiannual_cents >= 0),
  price_annual_cents int not null check (price_annual_cents >= 0),
  limits_config jsonb not null default '{}'::jsonb,
  is_recommended boolean not null default false,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint chk_plan_combo check ((is_combo and module_slug is null) or (not is_combo and module_slug is not null))
);
create unique index if not exists uq_dynamic_plans_name on public.dynamic_plans (lower(plan_name));

create table if not exists public.combo_modules (
  plan_id uuid not null references public.dynamic_plans(id) on delete cascade,
  module_slug text not null references public.hub_modules(slug),
  member_tier text,
  primary key (plan_id, module_slug)
);

create table if not exists public.plan_addons (
  id uuid primary key default gen_random_uuid(),
  module_slug text not null references public.hub_modules(slug),
  key text not null,
  name text not null,
  price_monthly_cents int not null check (price_monthly_cents >= 0),
  grants jsonb not null,
  is_active boolean not null default true,
  unique (module_slug, key)
);

-- Limites: null = ilimitado
insert into public.dynamic_plans
  (module_slug, plan_tier, plan_name, price_monthly_cents, price_semiannual_cents, price_annual_cents, limits_config, is_recommended, sort_order)
values
  ('vidlytics','starter','Vidlytics Starter', 5990, 31740,  53880,
    '{"max_videos":10,"max_pages":5,"storage_gb":10,"views":15000,"tracking":false,"badge_removable":false}', false, 1),
  ('vidlytics','pro','Vidlytics Pro',        13990, 74940, 131880,
    '{"max_videos":50,"max_pages":25,"storage_gb":40,"views":60000,"tracking":true,"badge_removable":true}', true, 2),
  ('vidlytics','scale','Vidlytics Scale',    27990, 149940, 263880,
    '{"max_videos":150,"max_pages":null,"storage_gb":120,"views":180000,"tracking":true,"badge_removable":true}', false, 3)
on conflict do nothing;

insert into public.plan_addons (module_slug, key, name, price_monthly_cents, grants) values
  ('vidlytics','videos_pages','+5 vídeos e +2 páginas', 1990, '{"max_videos":5,"max_pages":2}'),
  ('vidlytics','storage','+10 GB de armazenamento',    1490, '{"storage_gb":10}'),
  ('vidlytics','plays','+15.000 plays',                  1990, '{"views":15000}')
on conflict (module_slug, key) do nothing;

-- ===== Assinaturas: liga ao plano dinamico sem quebrar o legado =====
alter table public.subscriptions alter column plan_id drop not null;
alter table public.subscriptions add column if not exists dynamic_plan_id uuid references public.dynamic_plans(id);
alter table public.subscriptions add column if not exists billing_cycle text check (billing_cycle in ('monthly','semiannual','annual'));

create table if not exists public.subscription_addons (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions(id) on delete cascade,
  addon_id uuid not null references public.plan_addons(id),
  quantity int not null default 1 check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (subscription_id, addon_id)
);

-- Limite efetivo = plano base + soma dos add-ons
create or replace function public.get_effective_limits(p_store_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_sub uuid;
  v jsonb;
  a record;
begin
  if not (public.is_superadmin() or public.is_store_owner_or_member(p_store_id)) then
    return null;
  end if;

  select s.id, p.limits_config into v_sub, v
  from public.subscriptions s
  join public.dynamic_plans p on p.id = s.dynamic_plan_id
  where s.store_id = p_store_id
    and s.is_current = true
    and s.status in ('active','trialing')
    and (p.module_slug = 'vidlytics' or p.is_combo)
  order by (p.module_slug = 'vidlytics') desc, s.created_at desc
  limit 1;

  if v is null then return null; end if;

  for a in
    select ad.grants, sa.quantity
    from public.subscription_addons sa
    join public.plan_addons ad on ad.id = sa.addon_id
    where sa.subscription_id = v_sub
  loop
    v := v || coalesce((
      select jsonb_object_agg(
        k,
        case when jsonb_typeof(v->k) = 'null' then 'null'::jsonb
             else to_jsonb(coalesce((v->>k)::numeric, 0) + (a.grants->>k)::numeric * a.quantity) end
      )
      from jsonb_object_keys(a.grants) k
    ), '{}'::jsonb);
  end loop;

  return v;
end;
$$;
grant execute on function public.get_effective_limits(uuid) to authenticated;

-- ===== Cupons =====
create table if not exists public.discount_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type text not null check (discount_type in ('percentage','fixed_amount')),
  discount_value int not null check (discount_value > 0),
  max_uses int,
  times_used int not null default 0,
  applicable_plan_ids uuid[],
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint chk_coupon_pct check (discount_type <> 'percentage' or discount_value <= 100)
);
create unique index if not exists uq_coupon_code on public.discount_coupons (upper(code));

create or replace function public.validate_coupon(p_code text, p_plan_id uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare c public.discount_coupons;
begin
  select * into c from public.discount_coupons where upper(code) = upper(btrim(p_code));
  if not found or not c.is_active then return jsonb_build_object('valid', false, 'reason', 'not_found'); end if;
  if c.expires_at is not null and c.expires_at < now() then return jsonb_build_object('valid', false, 'reason', 'expired'); end if;
  if c.max_uses is not null and c.times_used >= c.max_uses then return jsonb_build_object('valid', false, 'reason', 'exhausted'); end if;
  if c.applicable_plan_ids is not null and (p_plan_id is null or not (p_plan_id = any(c.applicable_plan_ids))) then
    return jsonb_build_object('valid', false, 'reason', 'plan_not_allowed');
  end if;
  return jsonb_build_object('valid', true, 'type', c.discount_type, 'value', c.discount_value, 'coupon_id', c.id);
end;
$$;
grant execute on function public.validate_coupon(text, uuid) to authenticated;

-- Consumo atomico (chamar apenas pelo webhook/checkout com service_role)
create or replace function public.redeem_coupon(p_coupon_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  with u as (
    update public.discount_coupons
       set times_used = times_used + 1
     where id = p_coupon_id and is_active
       and (max_uses is null or times_used < max_uses)
       and (expires_at is null or expires_at > now())
    returning 1
  )
  select exists (select 1 from u);
$$;
revoke all on function public.redeem_coupon(uuid) from public, anon, authenticated;
grant execute on function public.redeem_coupon(uuid) to service_role;

-- ===== Banners =====
create table if not exists public.app_banners (
  id uuid primary key default gen_random_uuid(),
  target_area text not null check (target_area in ('global_hub','module_vidlytics','module_livecommerce')),
  segment text not null default 'all' check (segment in ('all','past_due','near_quota')),
  title text,
  message_text text not null,
  cta_label text,
  cta_url text,
  coupon_code text,
  bg_color text not null default '#0094eb',
  text_color text not null default '#ffffff',
  is_active boolean not null default true,
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create or replace function public.get_active_banners(p_area text, p_store_id uuid)
returns setof public.app_banners
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_past_due boolean := false;
  v_near boolean := false;
  v_limit numeric;
  v_used numeric;
begin
  if not (public.is_superadmin() or public.is_store_owner_or_member(p_store_id)) then return; end if;

  select exists (
    select 1 from public.subscriptions
    where store_id = p_store_id and is_current = true and status = 'past_due'
  ) into v_past_due;

  select (public.get_effective_limits(p_store_id)->>'views')::numeric into v_limit;
  if v_limit is not null and v_limit > 0 then
    select coalesce(sum(views_count), 0) into v_used
    from public.daily_video_metrics
    where store_id = p_store_id and "date" >= date_trunc('month', now())::date;
    v_near := v_used >= v_limit * 0.8;
  end if;

  return query
  select b.* from public.app_banners b
  where b.is_active
    and b.target_area = p_area
    and b.starts_at <= now()
    and (b.expires_at is null or b.expires_at > now())
    and (b.segment = 'all'
         or (b.segment = 'past_due' and v_past_due)
         or (b.segment = 'near_quota' and v_near))
  order by b.created_at desc;
end;
$$;
grant execute on function public.get_active_banners(text, uuid) to authenticated;

-- ===== Logs =====
create table if not exists public.system_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid,
  module_slug text,
  severity text not null check (severity in ('INFO','WARNING','CRITICAL')),
  event_type text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_system_logs_created on public.system_logs (created_at desc);
create index if not exists idx_system_logs_filter on public.system_logs (severity, module_slug, store_id, created_at desc);

create or replace function public.log_system_event(
  p_store_id uuid, p_module text, p_severity text, p_event text, p_payload jsonb default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_severity not in ('INFO','WARNING','CRITICAL') or coalesce(length(p_event), 0) not between 1 and 100 then return; end if;
  if p_payload is not null and length(p_payload::text) > 8000 then
    p_payload := jsonb_build_object('truncated', true);
  end if;
  insert into public.system_logs (store_id, module_slug, severity, event_type, payload)
  values (p_store_id, left(p_module, 50), p_severity, p_event, p_payload);
end;
$$;
grant execute on function public.log_system_event(uuid, text, text, text, jsonb) to anon, authenticated;

-- ===== RLS =====
alter table public.hub_modules        enable row level security;
alter table public.dynamic_plans      enable row level security;
alter table public.combo_modules      enable row level security;
alter table public.plan_addons        enable row level security;
alter table public.subscription_addons enable row level security;
alter table public.discount_coupons   enable row level security;
alter table public.app_banners        enable row level security;
alter table public.system_logs        enable row level security;

-- Leitura publica do catalogo (vitrine e pagina de precos)
drop policy if exists "catalogo le modulos" on public.hub_modules;
create policy "catalogo le modulos" on public.hub_modules for select using (true);
drop policy if exists "catalogo le planos" on public.dynamic_plans;
create policy "catalogo le planos" on public.dynamic_plans for select using (is_active or public.is_superadmin());
drop policy if exists "catalogo le combos" on public.combo_modules;
create policy "catalogo le combos" on public.combo_modules for select using (true);
drop policy if exists "catalogo le addons" on public.plan_addons;
create policy "catalogo le addons" on public.plan_addons for select using (is_active or public.is_superadmin());

-- Escrita somente super admin
do $$
declare t text;
begin
  foreach t in array array['hub_modules','dynamic_plans','combo_modules','plan_addons','discount_coupons','app_banners','subscription_addons']
  loop
    execute format('drop policy if exists "master escreve" on public.%I', t);
    execute format('create policy "master escreve" on public.%I for all using (public.is_superadmin()) with check (public.is_superadmin())', t);
  end loop;
end $$;

drop policy if exists "lojista le seus addons" on public.subscription_addons;
create policy "lojista le seus addons" on public.subscription_addons for select using (
  exists (select 1 from public.subscriptions s where s.id = subscription_id and public.is_store_owner_or_member(s.store_id))
);

drop policy if exists "master le logs" on public.system_logs;
create policy "master le logs" on public.system_logs for select using (public.is_superadmin());

-- Conferencia
select slug, status, is_public_for_sale from public.hub_modules order by sort_order;
select plan_name, price_monthly_cents, price_semiannual_cents, price_annual_cents, limits_config from public.dynamic_plans order by sort_order;