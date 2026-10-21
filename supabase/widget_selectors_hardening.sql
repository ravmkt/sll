begin;

delete from public.widget_selectors a
using public.widget_selectors b
where a.token = b.token and a.id < b.id;

create unique index if not exists idx_widget_selectors_token_unique
  on public.widget_selectors(token);

drop policy if exists "Permitir insert anonimo widget_selectors" on public.widget_selectors;
drop policy if exists "Permitir select widget_selectors" on public.widget_selectors;
revoke all on public.widget_selectors from anon;
revoke truncate, references, trigger on public.selector_sessions from authenticated;
revoke truncate, references, trigger on public.widget_selectors from authenticated;

revoke all on vidlytics.vid_widget_selectors from anon;
revoke truncate, references, trigger on vidlytics.vid_widget_selectors from authenticated;
revoke truncate, references, trigger on vidlytics.vid_selector_sessions from authenticated;

create or replace function public.widget_selector_get(p_token text)
returns table(selector text, story_id text)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select s.selector, s.story_id
  from public.widget_selectors s
  where p_token ~ '^sel_[0-9]{10,14}_[a-z0-9]{1,16}$'
    and s.token = p_token
    and s.created_at > now() - interval '30 minutes'
  order by s.updated_at desc nulls last
  limit 1
$function$;

create or replace function public.widget_selector_submit(p_token text, p_selector text, p_story_id text default null)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_token is null or p_token !~ '^sel_[0-9]{10,14}_[a-z0-9]{1,16}$' then
    raise exception 'token invalido';
  end if;
  if p_selector is null or length(p_selector) not between 1 and 1000 then
    raise exception 'seletor invalido';
  end if;
  if p_story_id is not null and length(p_story_id) > 64 then
    raise exception 'story invalido';
  end if;

  delete from public.widget_selectors where created_at < now() - interval '2 days';

  update public.widget_selectors
     set selector = p_selector,
         story_id = coalesce(p_story_id, story_id),
         updated_at = now()
   where token = p_token
     and created_at > now() - interval '30 minutes';

  if not found then
    if exists (select 1 from public.widget_selectors where token = p_token) then
      raise exception 'token expirado';
    end if;
    insert into public.widget_selectors (token, selector, story_id, created_at, updated_at)
    values (p_token, p_selector, p_story_id, now(), now());
  end if;

  return jsonb_build_object('ok', true);
end $function$;

grant execute on function public.widget_selector_get(text) to anon, authenticated;
grant execute on function public.widget_selector_submit(text, text, text) to anon, authenticated;

commit;
