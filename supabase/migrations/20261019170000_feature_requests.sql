create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  feedback_id uuid unique references public.app_feedbacks(id) on delete set null,
  store_id uuid references public.stores(id) on delete set null,
  title text not null,
  category text not null default 'Outro',
  module text not null default 'Geral',
  status text not null default 'received' check (status in ('received','review','planned','dev','done')),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.feature_request_votes (
  request_id uuid not null references public.feature_requests(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, store_id)
);

alter table public.feature_requests enable row level security;
alter table public.feature_request_votes enable row level security;
drop policy if exists fr_master_all on public.feature_requests;
create policy fr_master_all on public.feature_requests for all to authenticated
  using (public.is_superadmin()) with check (public.is_superadmin());

-- Importa as sugestoes que ja existem
insert into public.feature_requests (feedback_id, store_id, title, category, created_at)
select f.id, f.store_id,
       left(btrim(regexp_replace(f.comment, '^\[[^\]]*\]\s*', '')), 500),
       coalesce(substring(f.comment from '^\[([^\]]+)\]'), 'Outro'),
       f.created_at
from public.app_feedbacks f
where f.type = 'suggestion' and f.comment is not null
  and length(btrim(regexp_replace(f.comment, '^\[[^\]]*\]\s*', ''))) > 0
on conflict (feedback_id) do nothing;

insert into public.feature_request_votes (request_id, store_id)
select r.id, r.store_id from public.feature_requests r where r.store_id is not null
on conflict do nothing;

-- Novas sugestoes viram pedidos automaticamente (com o voto da loja autora)
create or replace function public.trg_feedback_to_request()
returns trigger language plpgsql security definer set search_path = public as $$
declare rid uuid; t text;
begin
  if new.type <> 'suggestion' or new.comment is null then return new; end if;
  t := left(btrim(regexp_replace(new.comment, '^\[[^\]]*\]\s*', '')), 500);
  if length(t) = 0 then return new; end if;
  insert into public.feature_requests (feedback_id, store_id, title, category)
  values (new.id, new.store_id, t, coalesce(substring(new.comment from '^\[([^\]]+)\]'), 'Outro'))
  on conflict (feedback_id) do nothing
  returning id into rid;
  if rid is not null and new.store_id is not null then
    insert into public.feature_request_votes (request_id, store_id) values (rid, new.store_id) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists trg_feedback_to_request on public.app_feedbacks;
create trigger trg_feedback_to_request after insert on public.app_feedbacks
  for each row execute function public.trg_feedback_to_request();

create or replace function public.fr_board(p_store_id uuid)
returns table (id uuid, title text, category text, module text, status text, votes bigint, voted boolean, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_store_owner_or_member(p_store_id) then raise exception 'forbidden'; end if;
  return query
    select r.id, r.title, r.category, r.module, r.status,
           (select count(*) from public.feature_request_votes v where v.request_id = r.id),
           exists (select 1 from public.feature_request_votes v where v.request_id = r.id and v.store_id = p_store_id),
           r.created_at
    from public.feature_requests r
    where not r.hidden
    order by 6 desc, r.created_at desc;
end $$;

create or replace function public.fr_toggle_vote(p_request_id uuid, p_store_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if not public.is_store_owner_or_member(p_store_id) then raise exception 'forbidden'; end if;
  if exists (select 1 from public.feature_request_votes v where v.request_id = p_request_id and v.store_id = p_store_id) then
    delete from public.feature_request_votes v where v.request_id = p_request_id and v.store_id = p_store_id;
    return false;
  end if;
  insert into public.feature_request_votes (request_id, store_id) values (p_request_id, p_store_id);
  return true;
end $$;

create or replace function public.admin_fr_list()
returns table (id uuid, title text, category text, module text, status text, hidden boolean, votes bigint, store_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return query
    select r.id, r.title, r.category, r.module, r.status, r.hidden,
           (select count(*) from public.feature_request_votes v where v.request_id = r.id),
           s.name::text, r.created_at
    from public.feature_requests r
    left join public.stores s on s.id = r.store_id
    order by 7 desc, r.created_at desc;
end $$;

grant execute on function public.fr_board(uuid) to authenticated;
grant execute on function public.fr_toggle_vote(uuid, uuid) to authenticated;
grant execute on function public.admin_fr_list() to authenticated;

select (select count(*) from public.feature_requests) as pedidos,
       (select count(*) from public.feature_request_votes) as votos;