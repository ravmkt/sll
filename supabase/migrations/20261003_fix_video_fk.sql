-- Repoint FKs de comments e video_likes para vidlytics.vid_videos (tabela real)
alter table public.comments drop constraint if exists comments_video_id_fkey;
alter table public.comments add constraint comments_video_id_fkey
  foreign key (video_id) references vidlytics.vid_videos(id) on delete cascade not valid;
alter table public.video_likes drop constraint if exists video_likes_video_id_fkey;
alter table public.video_likes add constraint video_likes_video_id_fkey
  foreign key (video_id) references vidlytics.vid_videos(id) on delete cascade not valid;
