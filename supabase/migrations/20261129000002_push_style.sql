alter table public.marketing_items drop constraint if exists marketing_items_notice_style_chk;
alter table public.marketing_items
  add constraint marketing_items_notice_style_chk
  check (notice_style in ('info','warning','urgent','success'));

create or replace function public.marketing_push_style(p_item_id uuid, p_store_id uuid)
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if p_store_id is null or not public.is_store_owner_or_member(p_store_id) then
    return null;
  end if;
  return (select i.notice_style from public.marketing_items i where i.id = p_item_id);
end $function$;

grant execute on function public.marketing_push_style(uuid, uuid) to authenticated;