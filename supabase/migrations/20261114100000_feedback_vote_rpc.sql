-- 20261114b_feedback_vote_rpc.sql
create or replace function public.submit_feedback_vote(
  p_store_id uuid, p_type text, p_reference_id text, p_vote text, p_comment text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_store_owner_or_member(p_store_id) then
    raise exception 'forbidden';
  end if;
  if p_type not in ('tip','noah') then raise exception 'invalid_type'; end if;
  if p_vote not in ('up','down') then raise exception 'invalid_vote'; end if;
  if p_reference_id is null or btrim(p_reference_id) = '' then raise exception 'invalid_reference'; end if;

  insert into public.app_feedbacks (store_id, user_id, type, reference_id, vote, comment)
  values (p_store_id, auth.uid(), p_type, left(p_reference_id, 100), p_vote,
          case when p_vote = 'down' then nullif(left(btrim(coalesce(p_comment,'')), 2000), '') end)
  on conflict (user_id, type, reference_id) do update
    set vote = excluded.vote, comment = excluded.comment, store_id = excluded.store_id
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.submit_feedback_vote(uuid, text, text, text, text) from public, anon;
grant execute on function public.submit_feedback_vote(uuid, text, text, text, text) to authenticated;
