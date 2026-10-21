begin;
revoke select on public.video_likes from anon;
update public.profiles
set is_super_admin = false
where is_super_admin
  and user_id not in (select user_id from public.admin_superusers where is_active);
commit;
