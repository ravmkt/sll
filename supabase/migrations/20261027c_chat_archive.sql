alter table live_commerce.live_chat_messages
  add column if not exists archived boolean not null default false;

create index if not exists live_chat_messages_live_arch_idx
  on live_commerce.live_chat_messages (live_id, archived, created_at);

create or replace function live_commerce.archive_live_chat(p_live_id uuid)
returns void
language plpgsql
security definer
set search_path = live_commerce, public
as $$
declare
  v_store uuid;
begin
  select store_id into v_store from live_commerce.lives where id = p_live_id;
  if v_store is null then raise exception 'live_not_found'; end if;
  if not (live_commerce.is_store_owner(v_store) or public.is_superadmin()) then
    raise exception 'forbidden';
  end if;
  update live_commerce.live_chat_messages
  set archived = true
  where live_id = p_live_id and archived = false;
end
$$;

revoke all on function live_commerce.archive_live_chat(uuid) from public, anon;
grant execute on function live_commerce.archive_live_chat(uuid) to authenticated;
notify pgrst, 'reload schema';