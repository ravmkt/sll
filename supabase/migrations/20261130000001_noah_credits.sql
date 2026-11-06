-- ===== 1) Tabela de uso de IA por loja =====
create table if not exists public.store_ai_usage (
  store_id uuid primary key,
  credits_total int not null default 0,
  credits_used int not null default 0,
  credits_extra int not null default 0,
  renewal_date date not null default current_date,
  updated_at timestamptz not null default now()
);

alter table public.store_ai_usage enable row level security;
drop policy if exists store_ai_usage_select on public.store_ai_usage;
create policy store_ai_usage_select on public.store_ai_usage
  for select to authenticated
  using (public.is_superadmin() or public.is_store_owner_or_member(store_id));

-- ===== 2) Chave ai_messages nos planos (so onde ainda nao existe) =====
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'dynamic_plans'
      and column_name = 'limits_config' and data_type = 'jsonb'
  ) then
    update public.dynamic_plans dp
       set limits_config = jsonb_set(
             coalesce(dp.limits_config, '{}'::jsonb), '{ai_messages}',
             to_jsonb(case
               when lower(coalesce(to_jsonb(dp)->>'name', '')) like '%scale%' then 1000
               when lower(coalesce(to_jsonb(dp)->>'name', '')) like '%pro%' then 250
               else 50 end))
     where not (coalesce(dp.limits_config, '{}'::jsonb) ? 'ai_messages');
  end if;
end $$;

-- ===== 3) Franquia mensal da loja: maior tier entre as assinaturas ativas =====
create or replace function public.noah_plan_credits(p_store_id uuid)
returns int
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
declare r record; best int := 0; v int;
begin
  for r in
    select s.status, s.dynamic_plan_id
    from public.subscriptions s
    where s.store_id = p_store_id
      and coalesce(s.is_current, true)
      and s.status in ('active', 'trial', 'trialing')
  loop
    if r.status in ('trial', 'trialing') then
      v := 1000;
    else
      select coalesce(
               nullif(to_jsonb(dp)->'limits_config'->>'ai_messages', '')::int,
               case
                 when lower(coalesce(to_jsonb(dp)->>'name', '')) like '%scale%' then 1000
                 when lower(coalesce(to_jsonb(dp)->>'name', '')) like '%pro%' then 250
                 else 50
               end)
        into v
        from public.dynamic_plans dp
       where dp.id = r.dynamic_plan_id;
      v := coalesce(v, 50);
    end if;
    best := greatest(best, v);
  end loop;
  return best;
end $function$;

-- ===== 4) Trava atomica: valida, consome 1 credito e faz o reset mensal =====
create or replace function public.noah_consume_credit(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  u public.store_ai_usage;
  v_total int;
  v_anchor date;
  v_next date;
  v_today date := (now() at time zone 'America/Sao_Paulo')::date;
  n int := 0;
  v_src text := null;
begin
  v_total := public.noah_plan_credits(p_store_id);

  select min(created_at)::date into v_anchor
  from public.subscriptions
  where store_id = p_store_id and coalesce(is_current, true);
  v_anchor := coalesce(v_anchor, v_today);

  insert into public.store_ai_usage (store_id, credits_total, renewal_date)
  values (p_store_id, v_total, v_anchor)
  on conflict (store_id) do nothing;

  select * into u from public.store_ai_usage where store_id = p_store_id for update;

  if u.renewal_date <= v_today then
    v_next := v_anchor;
    while v_next <= v_today loop
      n := n + 1;
      v_next := (v_anchor + (n * interval '1 month'))::date;
    end loop;
    u.credits_used := 0;
    u.renewal_date := v_next;
  end if;

  u.credits_total := v_total;

  if u.credits_used < u.credits_total then
    u.credits_used := u.credits_used + 1;
    v_src := 'plan';
  elsif u.credits_extra > 0 then
    u.credits_extra := u.credits_extra - 1;
    v_src := 'extra';
  end if;

  update public.store_ai_usage
     set credits_total = u.credits_total,
         credits_used = u.credits_used,
         credits_extra = u.credits_extra,
         renewal_date = u.renewal_date,
         updated_at = now()
   where store_id = p_store_id;

  return jsonb_build_object(
    'allowed', v_src is not null,
    'source', v_src,
    'reason', case when v_src is not null then null when v_total = 0 then 'no_plan' else 'limit_reached' end,
    'used', u.credits_used,
    'total', u.credits_total,
    'extra', u.credits_extra,
    'renewal_date', u.renewal_date
  );
end $function$;

-- ===== 5) Estorno (se a chamada da IA falhar) =====
create or replace function public.noah_refund_credit(p_store_id uuid, p_source text)
returns void
language sql
security definer
set search_path to 'public'
as $function$
  update public.store_ai_usage
     set credits_used = case when p_source = 'plan' then greatest(credits_used - 1, 0) else credits_used end,
         credits_extra = case when p_source = 'extra' then credits_extra + 1 else credits_extra end,
         updated_at = now()
   where store_id = p_store_id;
$function$;

-- ===== 6) Pacote avulso (sera chamado pelo webhook do add-on) =====
create or replace function public.noah_add_extra_credits(p_store_id uuid, p_qty int)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.store_ai_usage (store_id, credits_total, credits_extra)
  values (p_store_id, 0, greatest(p_qty, 0))
  on conflict (store_id) do update
    set credits_extra = public.store_ai_usage.credits_extra + greatest(p_qty, 0),
        updated_at = now();
end $function$;

-- ===== 7) Permissoes: somente a Edge Function (service_role) =====
revoke all on function public.noah_plan_credits(uuid) from public, anon, authenticated;
revoke all on function public.noah_consume_credit(uuid) from public, anon, authenticated;
revoke all on function public.noah_refund_credit(uuid, text) from public, anon, authenticated;
revoke all on function public.noah_add_extra_credits(uuid, int) from public, anon, authenticated;
grant execute on function public.noah_plan_credits(uuid) to service_role;
grant execute on function public.noah_consume_credit(uuid) to service_role;
grant execute on function public.noah_refund_credit(uuid, text) to service_role;
grant execute on function public.noah_add_extra_credits(uuid, int) to service_role;

-- ===== TESTE (rode depois, trocando pelo id da loja) =====
-- select public.noah_plan_credits('ID_DA_LOJA');
-- select public.noah_consume_credit('ID_DA_LOJA');
-- select * from public.store_ai_usage;
-- select id, limits_config->'ai_messages' as ai from public.dynamic_plans;