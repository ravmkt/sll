-- DIAGNOSTICO ITEM 7 (somente leitura). Rode no SQL Editor do projeto SLL e envie o resultado.
with
cols as (
  select table_schema || '.' || table_name as tabela,
         string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position) as colunas
  from information_schema.columns
  where (table_schema = 'public' and table_name in ('stores', 'sll_conversions', 'store_activity_events'))
     or (table_schema = 'vidlytics' and table_name in ('vid_videos', 'vid_stories'))
     or (table_schema = 'live_commerce' and table_name = 'lives')
  group by 1
),
base as (
  select s.id, s.created_at,
         coalesce((to_jsonb(s)->>'script_verified')::boolean, false) as script_ok
  from public.stores s
),
v as (select store_id, min(created_at) as t from vidlytics.vid_videos group by 1),
l as (select store_id, min(created_at) as t, min(started_at) as t_real from live_commerce.lives group by 1),
c as (select store_id, min(created_at) as t from public.sll_conversions where status = 'paid' group by 1)
select jsonb_pretty(jsonb_build_object(
  'colunas', (select jsonb_object_agg(tabela, colunas) from cols),
  'funil', jsonb_build_object(
    'cadastros', (select count(*) from base),
    'script_verificado', (select count(*) from base where script_ok),
    'com_video', (select count(*) from base b join v on v.store_id = b.id),
    'com_live_criada', (select count(*) from base b join l on l.store_id = b.id),
    'com_live_realizada', (select count(*) from base b join l on l.store_id = b.id where l.t_real is not null),
    'com_venda_paga', (select count(*) from base b join c on c.store_id = b.id)
  ),
  'dias_medios_desde_cadastro', jsonb_build_object(
    'ate_primeiro_video', (select round(avg(extract(epoch from (v.t - b.created_at)) / 86400.0)::numeric, 1) from base b join v on v.store_id = b.id),
    'ate_primeira_live', (select round(avg(extract(epoch from (l.t - b.created_at)) / 86400.0)::numeric, 1) from base b join l on l.store_id = b.id),
    'ate_primeira_venda', (select round(avg(extract(epoch from (c.t - b.created_at)) / 86400.0)::numeric, 1) from base b join c on c.store_id = b.id)
  ),
  'lojas_com_video_sem_script', (select count(*) from base b join v on v.store_id = b.id where not b.script_ok),
  'conversoes_por_status', (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb) from (select coalesce(status, '(nulo)') as status, count(*) n from public.sll_conversions group by 1) x),
  'eventos_atividade_por_tipo', (select coalesce(jsonb_object_agg(event_type, n), '{}'::jsonb) from (select event_type, count(*) n from public.store_activity_events group by 1) x)
)) as diagnostico;