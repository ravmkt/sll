update public.dynamic_plans set
  price_monthly_cents = 5990, price_semiannual_cents = 29940, price_annual_cents = 47880,
  limits_config = '{"views":5000,"tracking":false,"max_pages":5,"max_videos":5,"storage_gb":10,"badge_removable":false}'::jsonb
where module_slug = 'vidlytics' and plan_tier = 'starter' and not is_combo;

update public.dynamic_plans set
  price_monthly_cents = 9700, price_semiannual_cents = 47940, price_annual_cents = 80400,
  limits_config = '{"views":25000,"tracking":true,"max_pages":25,"max_videos":20,"storage_gb":40,"badge_removable":true}'::jsonb
where module_slug = 'vidlytics' and plan_tier = 'pro' and not is_combo;

update public.dynamic_plans set
  price_monthly_cents = 19700, price_semiannual_cents = 95400, price_annual_cents = 152400,
  limits_config = '{"views":180000,"tracking":true,"max_pages":null,"max_videos":150,"storage_gb":120,"badge_removable":true}'::jsonb
where module_slug = 'vidlytics' and plan_tier = 'scale' and not is_combo;

select public.sync_store_limits(id) from public.stores;

select plan_tier, price_monthly_cents, price_semiannual_cents, price_annual_cents, limits_config
from public.dynamic_plans where module_slug = 'vidlytics' and not is_combo order by sort_order;