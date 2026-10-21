begin;

drop policy if exists "Store isolation - select" on vidlytics.vid_display_locations;
drop policy if exists "Store isolation - insert" on vidlytics.vid_display_locations;
drop policy if exists "Store isolation - update" on vidlytics.vid_display_locations;
drop policy if exists "Store isolation - delete" on vidlytics.vid_display_locations;
drop policy if exists "vid_display_locations_select" on vidlytics.vid_display_locations;
drop policy if exists "vid_display_locations_insert" on vidlytics.vid_display_locations;
drop policy if exists "vid_display_locations_update" on vidlytics.vid_display_locations;
drop policy if exists "vid_display_locations_delete" on vidlytics.vid_display_locations;

alter table vidlytics.vid_display_locations enable row level security;

create policy "vid_display_locations_select_anon" on vidlytics.vid_display_locations
  for select to anon
  using (exists (
    select 1 from vidlytics.vid_stories s
    where s.id = vid_display_locations.story_id));

create policy "vid_display_locations_select_member" on vidlytics.vid_display_locations
  for select to authenticated
  using (exists (
    select 1 from vidlytics.vid_stories s
    where s.id = vid_display_locations.story_id
      and (is_store_owner_or_member(s.store_id) or is_superadmin())));

create policy "vid_display_locations_insert_member" on vidlytics.vid_display_locations
  for insert to authenticated
  with check (exists (
    select 1 from vidlytics.vid_stories s
    where s.id = vid_display_locations.story_id
      and (is_store_owner_or_member(s.store_id) or is_superadmin())));

create policy "vid_display_locations_update_member" on vidlytics.vid_display_locations
  for update to authenticated
  using (exists (
    select 1 from vidlytics.vid_stories s
    where s.id = vid_display_locations.story_id
      and (is_store_owner_or_member(s.store_id) or is_superadmin())))
  with check (exists (
    select 1 from vidlytics.vid_stories s
    where s.id = vid_display_locations.story_id
      and (is_store_owner_or_member(s.store_id) or is_superadmin())));

create policy "vid_display_locations_delete_member" on vidlytics.vid_display_locations
  for delete to authenticated
  using (exists (
    select 1 from vidlytics.vid_stories s
    where s.id = vid_display_locations.story_id
      and (is_store_owner_or_member(s.store_id) or is_superadmin())));

revoke all on vidlytics.vid_display_locations from anon;
grant select on vidlytics.vid_display_locations to anon;
grant select, insert, update, delete on vidlytics.vid_display_locations to authenticated;

commit;
