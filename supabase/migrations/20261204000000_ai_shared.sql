-- Uso da plataforma (ex.: Benchmarks) nao tem loja
alter table noah.usage_log alter column store_id drop not null;

-- Benchmarks: modelo com preco cadastrado e reserva
update public.admin_ai_settings
   set model = 'gemini-2.5-flash', fallback_model = 'gemini-3.1-flash-lite'
 where purpose = 'benchmarks';

notify pgrst, 'reload schema';

select purpose, model, fallback_model, use_web_search, enabled from public.admin_ai_settings order by 1;