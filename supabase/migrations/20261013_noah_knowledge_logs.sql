create or replace function public.noah_is_master()
returns boolean language plpgsql stable security definer set search_path = public as $$
declare r boolean := false;
begin
  begin
    if coalesce((auth.jwt() -> 'app_metadata' ->> 'is_superadmin')::boolean, false) then return true; end if;
  exception when others then null;
  end;
  begin
    if to_regclass('public.admin_superusers') is not null then
      execute 'select exists (select 1 from public.admin_superusers where user_id = auth.uid())' into r;
    end if;
  exception when others then r := false;
  end;
  return coalesce(r, false);
end $$;
grant execute on function public.noah_is_master() to authenticated;

create table if not exists public.noah_knowledge (
  id uuid primary key default gen_random_uuid(),
  module text not null default 'geral' check (module in ('vidlytics', 'sll-hub', 'geral')),
  title text not null,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.noah_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid,
  model text,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  user_message text,
  created_at timestamptz not null default now()
);
create index if not exists idx_noah_logs_created on public.noah_logs (created_at desc);
create index if not exists idx_noah_knowledge_active on public.noah_knowledge (is_active, module);

create or replace function public.noah_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists trg_noah_knowledge_updated on public.noah_knowledge;
create trigger trg_noah_knowledge_updated before update on public.noah_knowledge
for each row execute function public.noah_touch_updated_at();

alter table public.noah_knowledge enable row level security;
alter table public.noah_logs enable row level security;

drop policy if exists noah_knowledge_master on public.noah_knowledge;
create policy noah_knowledge_master on public.noah_knowledge
  for all to authenticated using (public.noah_is_master()) with check (public.noah_is_master());

drop policy if exists noah_logs_master_read on public.noah_logs;
create policy noah_logs_master_read on public.noah_logs
  for select to authenticated using (public.noah_is_master());

create or replace function public.admin_noah_metrics(p_from timestamptz)
returns table (model text, questions bigint, prompt_tokens bigint, completion_tokens bigint, total_tokens bigint)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.noah_is_master() then raise exception 'FORBIDDEN'; end if;
  return query
    select coalesce(l.model, 'desconhecido'), count(*)::bigint,
           coalesce(sum(l.prompt_tokens), 0)::bigint,
           coalesce(sum(l.completion_tokens), 0)::bigint,
           coalesce(sum(l.total_tokens), 0)::bigint
    from public.noah_logs l
    where l.created_at >= p_from
    group by 1
    order by 2 desc;
end $$;
grant execute on function public.admin_noah_metrics(timestamptz) to authenticated;

select to_regclass('public.noah_knowledge') as knowledge, to_regclass('public.noah_logs') as logs;