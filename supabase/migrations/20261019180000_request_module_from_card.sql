create or replace function public.trg_feedback_to_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid uuid; t text; m text;
begin
  if new.type <> 'suggestion' or new.comment is null then return new; end if;
  t := left(btrim(regexp_replace(new.comment, '^\[[^\]]*\]\s*', '')), 500);
  if length(t) = 0 then return new; end if;
  m := left(coalesce(nullif(btrim(new.payload->>'module'), ''), 'Geral'), 40);
  insert into public.feature_requests (feedback_id, store_id, title, category, module)
  values (new.id, new.store_id, t, coalesce(substring(new.comment from '^\[([^\]]+)\]'), 'Outro'), m)
  on conflict (feedback_id) do nothing
  returning id into rid;
  if rid is not null and new.store_id is not null then
    insert into public.feature_request_votes (request_id, store_id) values (rid, new.store_id) on conflict do nothing;
  end if;
  return new;
end $$;
select 'ok' as trigger_atualizado;