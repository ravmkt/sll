-- Rode no SQL Editor do Supabase (projeto SLL) e envie o resultado.

-- 1) Colunas das tabelas de exibicao
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'vidlytics' and table_name in ('vid_appearances', 'vid_videos')
order by table_name, ordinal_position;

-- 2) Configuracao de exibicao da loja
select * from vidlytics.vid_appearances
where store_id = '955ce943-52b4-4876-802c-e4afe5e9c4c8';

-- 3) Videos da loja
select * from vidlytics.vid_videos
where store_id = '955ce943-52b4-4876-802c-e4afe5e9c4c8'
order by created_at desc
limit 5;

-- 4) Dominios cadastrados da loja (black.useanny.com precisa estar liberado?)
select * from public.stores where id = '955ce943-52b4-4876-802c-e4afe5e9c4c8';