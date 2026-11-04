-- Rollback: apaga o esquema noah (PERDE o log de uso unificado; o noah_logs original permanece).
begin;
drop schema if exists noah cascade;
delete from public.admin_ai_settings where purpose in ('support','insights','feedback') and enabled = false;
commit;