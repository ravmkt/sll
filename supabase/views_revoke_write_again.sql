begin;

revoke insert, update, delete, truncate, references, trigger
on public.vid_videos, public.vidlytics_appearances
from anon, authenticated;

commit;
