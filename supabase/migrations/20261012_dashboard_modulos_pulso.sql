-- Status 'hidden' para modulos
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.hub_modules'::regclass and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.hub_modules drop constraint %I', c);
  end loop;
end $$;
alter table public.hub_modules
  add constraint hub_modules_status_check check (status in ('active','coming_soon','maintenance','hidden'));

alter table public.hub_modules add column if not exists logo_url text;
alter table public.hub_modules add column if not exists description text;
alter table public.hub_modules add column if not exists benefits jsonb not null default '[]'::jsonb;
alter table public.hub_modules add column if not exists route_path text;

update public.hub_modules set
  description = 'Vídeos interativos que vendem dentro da sua loja.',
  benefits = '["Stories em vídeo no site","Vídeos flutuantes e carrossel de reels","Botão Compre no Vídeo em 1 clique","Carregamento leve e assíncrono"]'::jsonb,
  route_path = '/dashboard/modules/vidlytics'
where slug = 'vidlytics' and description is null;

update public.hub_modules set
  description = 'Transmissões ao vivo direto no seu e-commerce.',
  benefits = '["Lives com produtos vinculados","Chat em tempo real","Tudo na página da sua loja"]'::jsonb,
  route_path = '/dashboard/modules/live-commerce'
where slug = 'live_commerce' and description is null;

insert into public.hub_modules (slug, name, status, is_public_for_sale, sort_order, description, benefits)
values ('provador', 'Provador Virtual', 'coming_soon', false, 3,
        'Ajude o cliente a escolher o tamanho certo.',
        '["Recomendação de tamanho","Menos trocas e devoluções"]'::jsonb)
on conflict (slug) do nothing;

-- Lista de espera
create table if not exists public.module_waitlist (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  module_slug text not null references public.hub_modules(slug) on delete cascade,
  user_id uuid default auth.uid(),
  created_at timestamptz not null default now(),
  unique (store_id, module_slug)
);
alter table public.module_waitlist enable row level security;
drop policy if exists "le lista de espera" on public.module_waitlist;
create policy "le lista de espera" on public.module_waitlist
  for select using (public.is_store_owner_or_member(store_id) or public.is_superadmin());
drop policy if exists "entra na lista de espera" on public.module_waitlist;
create policy "entra na lista de espera" on public.module_waitlist
  for insert with check (public.is_store_owner_or_member(store_id));

-- Pulso do dia (fuso de Sao Paulo)
create or replace function public.get_store_pulse(p_store_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  d0 timestamptz := (date_trunc('day', now() at time zone 'America/Sao_Paulo')) at time zone 'America/Sao_Paulo';
  r jsonb;
begin
  if not (public.is_superadmin() or public.is_store_owner_or_member(p_store_id)) then
    return null;
  end if;

  select jsonb_build_object(
    'interactions', coalesce(nullif(count(distinct x.sid), 0), count(*) filter (where x.event_type = 'video_view')),
    'buy_clicks', count(*) filter (where x.event_type in ('product_click', 'whatsapp_click')),
    'engaged', count(distinct x.sid) filter (where x.event_type in ('progress', 'story_complete')),
    'views', count(*) filter (where x.event_type = 'video_view')
  ) into r
  from (
    select e.event_type, to_jsonb(e) ->> 'session_id' as sid
    from public.store_activity_events e
    where e.store_id::text = p_store_id::text and e.created_at >= d0
  ) x;

  return r;
end;
$$;

revoke all on function public.get_store_pulse(uuid) from public, anon;
grant execute on function public.get_store_pulse(uuid) to authenticated;

select slug, name, status, route_path from public.hub_modules order by sort_order;
-- Para ver quem entrou na lista de espera:
-- select module_slug, count(*) from public.module_waitlist group by 1;