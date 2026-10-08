alter function public.admin_list_stores() rename to admin_master_list_stores;
alter function public.admin_store_detail(uuid) rename to admin_master_store_detail;

-- Conferencia: colunas/funcoes usadas que NAO existem (esperado: nenhuma linha)
select t.tbl as item, t.col as faltando
from (values
  ('stores','storage_used_bytes'),('stores','storage_limit_bytes'),('stores','trial_ends_at'),
  ('stores','past_due_since'),('stores','owner_user_id'),('stores','whatsapp'),
  ('invoices','amount_cents'),('invoices','due_date'),('invoices','paid_at'),
  ('invoices','description'),('invoices','created_at'),('invoices','status'),
  ('store_activity_events','event_type'),('store_activity_events','created_at'),
  ('referral_rewards','referrer_store_id'),('referral_rewards','amount'),
  ('admin_audit_logs','admin_id'),('admin_audit_logs','details'),
  ('subscriptions','module_key'),('subscriptions','is_current')
) t(tbl, col)
where not exists (
  select 1 from information_schema.columns c
  where c.table_schema = 'public' and c.table_name = t.tbl and c.column_name = t.col)
union all
select 'function', 'is_superadmin'
where not exists (select 1 from pg_proc where proname = 'is_superadmin' and pronamespace = 'public'::regnamespace);