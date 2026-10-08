create table if not exists public.operational_custom_costs (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  cost_type varchar(30) not null default 'fixed_monthly' check (cost_type in ('fixed_monthly','variable_quota')),
  currency varchar(10) not null default 'BRL' check (currency in ('BRL','USD')),
  amount numeric(10,2) not null default 0 check (amount >= 0),
  quota_notes varchar(255),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.operational_custom_costs enable row level security;
drop policy if exists "master gerencia despesas" on public.operational_custom_costs;
create policy "master gerencia despesas" on public.operational_custom_costs
  for all using (public.is_superadmin()) with check (public.is_superadmin());

insert into public.operational_custom_costs (name, cost_type, currency, amount, quota_notes)
select 'Domínios e ferramentas', 'fixed_monthly', 'BRL', domain_and_tools_monthly_brl, 'Migrado do campo antigo'
from public.infrastructure_cost_settings
where id = 1 and domain_and_tools_monthly_brl > 0
  and not exists (select 1 from public.operational_custom_costs);

select count(*) as despesas from public.operational_custom_costs;