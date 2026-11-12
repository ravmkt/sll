-- Rode no SQL Editor do Supabase (projeto SLL)
select id, allowed_mime_types, file_size_limit from storage.buckets where id = 'builder-assets';

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/gif','image/avif',
  'video/mp4','video/webm'
]
where id = 'builder-assets';