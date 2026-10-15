alter table public.invoices add column if not exists payment_method text;
alter table public.invoices add column if not exists invoice_url text;

-- Overview: acrescenta storage usado/limite por loja
create or replace function public.admin_master_stores_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(
      o.v || jsonb_build_object(
        'modules', public._store_real_modules((o.v ->> 'id')::uuid),
        'storage_used_bytes', (select s.storage_used_bytes from public.stores s where s.id::text = o.v ->> 'id'),
        'storage_limit_bytes', (select s.storage_limit_bytes from public.stores s where s.id::text = o.v ->> 'id')
      ) order by o.n)
    from jsonb_array_elements(public._admin_master_stores_overview_base()) with ordinality as o(v, n)
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.admin_master_stores_overview() from public, anon;
grant execute on function public.admin_master_stores_overview() to authenticated;

-- Periodo: faturas com meio de pagamento e link
create or replace function public.admin_master_store_period(p_store_id uuid, p_days int default 30)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_since timestamptz := case when p_days is null or p_days <= 0 then '-infinity'::timestamptz else now() - make_interval(days => p_days) end;
  v_tbl text; v_events jsonb := '{}'::jsonb; v_inv jsonb; v_paid bigint; v_paid_n int;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;

  select format('%I.%I', table_schema, table_name) into v_tbl
  from information_schema.columns
  where table_schema in ('public','vidlytics')
  group by table_schema, table_name
  having bool_or(column_name = 'store_id') and bool_or(column_name = 'event_type') and bool_or(column_name = 'created_at')
  order by (table_name like '%event%') desc, table_name
  limit 1;

  if v_tbl is not null then
    execute format('select coalesce(jsonb_object_agg(event_type, n), ''{}''::jsonb) from (select event_type, count(*) n from %s where store_id::text = $1::text and created_at >= $2 group by 1) x', v_tbl)
      into v_events using p_store_id, v_since;
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc), '[]'::jsonb) into v_inv
  from (select id, amount_cents, status, due_date, paid_at, description, created_at, payment_method, invoice_url
        from public.invoices where store_id = p_store_id and created_at >= v_since
        order by created_at desc limit 500) x;

  select coalesce(sum(amount_cents), 0), count(*) into v_paid, v_paid_n
  from public.invoices where store_id = p_store_id and status = 'paid';

  return jsonb_build_object('events', v_events, 'events_source', v_tbl, 'invoices', v_inv,
                            'paid_cents', v_paid, 'paid_count', v_paid_n);
end $$;
grant execute on function public.admin_master_store_period(uuid, int) to authenticated;

select count(*) filter (where payment_method is null and asaas_payment_id is not null) as faturas_sem_meio,
       count(*) as total
from public.invoices;