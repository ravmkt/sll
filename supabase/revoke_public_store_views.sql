begin;

revoke all on public.stores_public from anon, authenticated;
revoke all on public.store_settings_public from anon, authenticated;

commit;
