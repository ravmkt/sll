create or replace function vidlytics.sync_bunny_media()
returns trigger language plpgsql as $$
begin
  if new.hls_url is not null and new.hls_url <> '' and coalesce(new.video_url,'') = '' then
    new.video_url := new.hls_url;
  end if;
  if new.thumb_url is not null and new.thumb_url <> '' and coalesce(new.thumbnail_url,'') = '' then
    new.thumbnail_url := new.thumb_url;
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_bunny_media on vidlytics.vid_videos;
create trigger trg_sync_bunny_media
before insert or update on vidlytics.vid_videos
for each row execute function vidlytics.sync_bunny_media();

update vidlytics.vid_videos
set video_url = hls_url
where bunny_video_id is not null and coalesce(video_url,'') = '' and hls_url is not null;

update vidlytics.vid_videos
set thumbnail_url = thumb_url
where bunny_video_id is not null and coalesce(thumbnail_url,'') = '' and thumb_url is not null;
