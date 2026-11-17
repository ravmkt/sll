-- Limites por plano (dado compartilhado entre módulos -> public)
create table if not exists public.plan_limits (
  plan text primary key,
  max_videos integer not null,
  max_storage_gb numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.plan_limits enable row level security;

drop policy if exists "plan_limits_read" on public.plan_limits;
create policy "plan_limits_read" on public.plan_limits
  for select to authenticated using (true);

insert into public.plan_limits (plan, max_videos, max_storage_gb) values
  ('basic', 20, 5),
  ('pro', 100, 25),
  ('enterprise', 500, 100)
on conflict (plan) do nothing;

-- Plano da loja
alter table public.stores add column if not exists plan text not null default 'basic';

-- Colunas do Bunny em vid_videos
alter table vidlytics.vid_videos add column if not exists bunny_video_id text;
alter table vidlytics.vid_videos add column if not exists hls_url text;
alter table vidlytics.vid_videos add column if not exists preview_url text;
alter table vidlytics.vid_videos add column if not exists thumb_url text;
alter table vidlytics.vid_videos add column if not exists duration_seconds integer;
alter table vidlytics.vid_videos add column if not exists size_bytes bigint not null default 0;
alter table vidlytics.vid_videos add column if not exists status text;

create unique index if not exists vid_videos_bunny_video_id_key
  on vidlytics.vid_videos (bunny_video_id) where bunny_video_id is not null;
