create table if not exists pulse.info_cards (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null references public.stores(id) on delete cascade,
  name       text not null default 'Card informativo',
  active     boolean not null default false,
  title      text not null default '',
  tiers      jsonb not null default '[]'::jsonb,
  footer     text not null default '',
  placement  jsonb not null default '{"selector":"","position":"before"}'::jsonb,
  style_id   uuid references pulse.widget_styles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists info_cards_store_idx on pulse.info_cards(store_id, active);
alter table pulse.info_cards enable row level security;
-- sem policies: acesso apenas pelas RPCs security definer

-- migra a régua existente como 1º card
insert into pulse.info_cards(store_id, name, active, title, tiers, footer, placement, style_id)
select r.store_id, 'Card informativo 1', r.active, r.title, r.tiers, r.footer, r.placement, r.style_id
from pulse.ruler_settings r
where not exists (select 1 from pulse.info_cards c where c.store_id = r.store_id)
  and (r.active or r.title <> '' or jsonb_array_length(r.tiers) > 0);

create or replace function public.widgets_cards_list(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at)
                   from pulse.info_cards c where c.store_id = p_store_id), '[]'::jsonb);
end $$;

create or replace function public.widgets_card_save(
  p_store_id uuid, p_id uuid, p_name text, p_active boolean, p_title text,
  p_tiers jsonb, p_footer text, p_placement jsonb, p_style_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_name text := coalesce(nullif(trim(p_name), ''), 'Card informativo');
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  if jsonb_typeof(coalesce(p_tiers, '[]'::jsonb)) <> 'array' then raise exception 'invalid_tiers'; end if;
  if p_style_id is not null and not exists (
    select 1 from pulse.widget_styles where id = p_style_id and store_id = p_store_id) then
    raise exception 'invalid_style';
  end if;
  if p_id is null then
    insert into pulse.info_cards(store_id, name, active, title, tiers, footer, placement, style_id)
    values (p_store_id, v_name, coalesce(p_active, false), coalesce(p_title, ''), coalesce(p_tiers, '[]'::jsonb),
            coalesce(p_footer, ''), coalesce(p_placement, '{"selector":"","position":"before"}'::jsonb), p_style_id)
    returning id into v_id;
  else
    update pulse.info_cards
       set name = v_name, active = coalesce(p_active, false), title = coalesce(p_title, ''),
           tiers = coalesce(p_tiers, '[]'::jsonb), footer = coalesce(p_footer, ''),
           placement = coalesce(p_placement, placement), style_id = p_style_id, updated_at = now()
     where id = p_id and store_id = p_store_id returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
  end if;
  return (select to_jsonb(c) from pulse.info_cards c where c.id = v_id);
end $$;

create or replace function public.widgets_card_set_active(p_store_id uuid, p_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  update pulse.info_cards set active = coalesce(p_active, false), updated_at = now()
   where id = p_id and store_id = p_store_id;
  if not found then raise exception 'not_found'; end if;
end $$;

create or replace function public.widgets_card_delete(p_store_id uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  delete from pulse.info_cards where id = p_id and store_id = p_store_id;
end $$;

-- config pública: lista de cards ativos (mantém "ruler"/"style" do 1º p/ compatibilidade com JS em cache)
create or replace function public.widgets_public_config(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v_cards jsonb; v_first jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'title', c.title, 'tiers', c.tiers, 'footer', c.footer, 'placement', c.placement,
      'style', (select s.config from pulse.widget_styles s
                 where s.store_id = c.store_id and s.widget_type = 'ruler'
                   and (s.id = c.style_id or (c.style_id is null and s.is_default))
                 order by (s.id = c.style_id) desc nulls last limit 1)
    ) order by c.created_at), '[]'::jsonb)
  into v_cards from pulse.info_cards c where c.store_id = p_store_id and c.active;
  if jsonb_array_length(v_cards) = 0 then return null; end if;
  v_first := v_cards -> 0;
  return jsonb_build_object('cards', v_cards, 'ruler', v_first - 'style' - 'id', 'style', v_first -> 'style');
end $$;

revoke all on function public.widgets_cards_list(uuid) from public;
revoke all on function public.widgets_card_save(uuid,uuid,text,boolean,text,jsonb,text,jsonb,uuid) from public;
revoke all on function public.widgets_card_set_active(uuid,uuid,boolean) from public;
revoke all on function public.widgets_card_delete(uuid,uuid) from public;
grant execute on function public.widgets_cards_list(uuid) to authenticated;
grant execute on function public.widgets_card_save(uuid,uuid,text,boolean,text,jsonb,text,jsonb,uuid) to authenticated;
grant execute on function public.widgets_card_set_active(uuid,uuid,boolean) to authenticated;
grant execute on function public.widgets_card_delete(uuid,uuid) to authenticated;
grant execute on function public.widgets_public_config(uuid) to anon, authenticated;

notify pgrst, 'reload schema';