create table if not exists public.idea_meta (
  feedback_id uuid primary key references public.app_feedbacks(id) on delete cascade,
  status text not null default 'received' check (status in ('received','analysis','planned','in_progress','done','hidden')),
  public_title text,
  updated_at timestamptz not null default now()
);

create table if not exists public.idea_votes (
  feedback_id uuid not null references public.app_feedbacks(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  primary key (feedback_id, store_id)
);

alter table public.idea_meta enable row level security;
alter table public.idea_votes enable row level security;

insert into public.idea_votes (feedback_id, store_id, user_id)
select f.id, f.store_id, null
from public.app_feedbacks f
where f.type = 'suggestion' and f.store_id is not null
on conflict do nothing;

create or replace function public.idea_autovote()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.type = 'suggestion' and new.store_id is not null then
    insert into public.idea_votes (feedback_id, store_id) values (new.id, new.store_id) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_idea_autovote on public.app_feedbacks;
create trigger trg_idea_autovote after insert on public.app_feedbacks
  for each row when (new.type = 'suggestion') execute function public.idea_autovote();

create or replace function public.ideas_list(p_store_id uuid)
returns table (id uuid, category text, body text, status text, votes bigint, voted boolean, mine boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_store_owner_or_member(p_store_id) then raise exception 'forbidden'; end if;
  return query
  select f.id,
         coalesce(substring(f.comment from '^\[([^\]]+)\]'), 'Outro'),
         coalesce(nullif(btrim(m.public_title), ''), btrim(regexp_replace(f.comment, '^\[[^\]]+\]\s*', ''))),
         coalesce(m.status, 'received'),
         (select count(*) from public.idea_votes v where v.feedback_id = f.id),
         exists (select 1 from public.idea_votes v where v.feedback_id = f.id and v.store_id = p_store_id),
         (f.store_id = p_store_id),
         f.created_at
  from public.app_feedbacks f
  left join public.idea_meta m on m.feedback_id = f.id
  where f.type = 'suggestion' and coalesce(m.status, 'received') <> 'hidden';
end;
$$;
grant execute on function public.ideas_list(uuid) to authenticated;

create or replace function public.ideas_toggle_vote(p_feedback_id uuid, p_store_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_store_owner_or_member(p_store_id) then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.app_feedbacks f where f.id = p_feedback_id and f.type = 'suggestion') then
    raise exception 'not_found';
  end if;
  if exists (select 1 from public.idea_votes v where v.feedback_id = p_feedback_id and v.store_id = p_store_id) then
    delete from public.idea_votes v where v.feedback_id = p_feedback_id and v.store_id = p_store_id;
    return false;
  end if;
  insert into public.idea_votes (feedback_id, store_id) values (p_feedback_id, p_store_id);
  return true;
end;
$$;
grant execute on function public.ideas_toggle_vote(uuid, uuid) to authenticated;

create or replace function public.admin_ideas_list()
returns table (id uuid, category text, body text, public_title text, status text, votes bigint, store_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return query
  select f.id,
         coalesce(substring(f.comment from '^\[([^\]]+)\]'), 'Outro'),
         btrim(regexp_replace(f.comment, '^\[[^\]]+\]\s*', '')),
         m.public_title,
         coalesce(m.status, 'received'),
         (select count(*) from public.idea_votes v where v.feedback_id = f.id),
         s.name::text,
         f.created_at
  from public.app_feedbacks f
  left join public.idea_meta m on m.feedback_id = f.id
  left join public.stores s on s.id = f.store_id
  where f.type = 'suggestion'
  order by 6 desc, f.created_at desc;
end;
$$;
grant execute on function public.admin_ideas_list() to authenticated;

create or replace function public.admin_idea_set(p_feedback_id uuid, p_status text, p_title text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  insert into public.idea_meta (feedback_id, status, public_title, updated_at)
  values (p_feedback_id, p_status, nullif(btrim(coalesce(p_title, '')), ''), now())
  on conflict (feedback_id) do update
    set status = excluded.status, public_title = excluded.public_title, updated_at = now();
end;
$$;
grant execute on function public.admin_idea_set(uuid, text, text) to authenticated;

select count(*) as votos_iniciais from public.idea_votes;