-- Rollback do reparo. Remove apenas colunas e indice criados pela migration.
-- ATENCAO: apagar unsubscribed/unsubscribed_at PERDE os descadastros (SAIR) ja registrados.
-- As tabelas NAO sao removidas para nao perder dados; use os comandos comentados se precisar.
begin;

drop index if exists live_commerce.live_notif_logs_dedupe_uidx;

alter table live_commerce.live_leads
  drop column if exists unsubscribed,
  drop column if exists unsubscribed_at;

alter table if exists live_commerce.live_notify_settings
  drop column if exists evolution_instance,
  drop column if exists evolution_token,
  drop column if exists evolution_status,
  drop column if exists evolution_number,
  drop column if exists evolution_connected_at;

-- drop table if exists live_commerce.live_notification_logs;
-- drop table if exists live_commerce.live_notify_templates;
-- drop table if exists live_commerce.live_notify_settings;

notify pgrst, 'reload schema';

commit;