create table if not exists public.nps_survey_events (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references public.nps_surveys(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid default auth.uid(),
  event text not null check (event in ('view', 'dismiss')),
  created_at timestamptz not null default now()
);
create index if not exists idx_nps_events_survey on public.nps_survey_events (survey_id, event);

alter table public.nps_survey_events enable row level security;
drop policy if exists "master le eventos nps" on public.nps_survey_events;
create policy "master le eventos nps" on public.nps_survey_events for select to authenticated
  using (public.is_superadmin());

create or replace function public.nps_log_event(p_survey_id uuid, p_store_id uuid, p_event text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('view', 'dismiss') then return; end if;
  if not public.is_store_owner_or_member(p_store_id) then return; end if;
  insert into public.nps_survey_events (survey_id, store_id, event) values (p_survey_id, p_store_id, p_event);
end;
$$;
grant execute on function public.nps_log_event(uuid, uuid, text) to authenticated;

create or replace function public.admin_nps_survey_stats()
returns table (survey_id uuid, views bigint, dismissals bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return query
    select e.survey_id,
           count(*) filter (where e.event = 'view')::bigint,
           count(*) filter (where e.event = 'dismiss')::bigint
    from public.nps_survey_events e
    group by e.survey_id;
end;
$$;
grant execute on function public.admin_nps_survey_stats() to authenticated;

select count(*) as eventos from public.nps_survey_events;