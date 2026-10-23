-- Fecha funcoes admin_* ao anon (painel usa usuario logado)
begin;
revoke execute on function public.admin_get_affiliate_settings() from public, anon;
revoke execute on function public.admin_set_affiliate_settings(integer, integer, numeric, numeric, numeric, integer, numeric) from public, anon;
revoke execute on function public.admin_set_trial_days(integer) from public, anon;
revoke execute on function public.admin_staging_sync_live(text, text, jsonb) from public, anon;
grant execute on function public.admin_get_affiliate_settings() to authenticated, service_role;
grant execute on function public.admin_set_affiliate_settings(integer, integer, numeric, numeric, numeric, integer, numeric) to authenticated, service_role;
grant execute on function public.admin_set_trial_days(integer) to authenticated, service_role;
grant execute on function public.admin_staging_sync_live(text, text, jsonb) to authenticated, service_role;
commit;