alter table pulse.info_cards
  add column if not exists kind text not null default 'info' check (kind in ('info','benefits')),
  add column if not exists icon_position text not null default 'left' check (icon_position in ('top','left','right')),
  add column if not exists icon_size int not null default 28,
  add column if not exists icon_color text,
  add column if not exists icon_bg text not null default 'none' check (icon_bg in ('none','circle','square')),
  add column if not exists icon_bg_color text,
  add column if not exists design jsonb not null default '{}'::jsonb;

create index if not exists info_cards_kind_idx on pulse.info_cards (store_id, kind);

drop function if exists public.widgets_card_save(uuid,uuid,text,boolean,text,jsonb,text,jsonb,uuid);

create or replace function public.widgets_card_save(
  p_store_id uuid, p_id uuid, p_name text, p_active boolean, p_title text,
  p_tiers jsonb, p_footer text, p_placement jsonb, p_style_id uuid,
  p_extra jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_name text := coalesce(nullif(trim(p_name), ''), 'Card informativo');
  x jsonb := coalesce(p_extra, '{}'::jsonb);
begin
  if not pulse.widgets_can_manage(p_store_id) then raise exception 'forbidden'; end if;
  if jsonb_typeof(coalesce(p_tiers, '[]'::jsonb)) <> 'array' then raise exception 'invalid_tiers'; end if;
  if length(coalesce(p_tiers, '[]'::jsonb)::text) > 200000 then raise exception 'tiers_too_large'; end if;
  if x ? 'kind' and x->>'kind' not in ('info','benefits') then raise exception 'invalid_kind'; end if;
  if x ? 'icon_position' and x->>'icon_position' not in ('top','left','right') then raise exception 'invalid_icon_position'; end if;
  if x ? 'icon_bg' and x->>'icon_bg' not in ('none','circle','square') then raise exception 'invalid_icon_bg'; end if;
  if p_style_id is not null and not exists (
    select 1 from pulse.widget_styles where id = p_style_id and store_id = p_store_id) then
    raise exception 'invalid_style';
  end if;

  if p_id is null then
    insert into pulse.info_cards(store_id, name, active, title, tiers, footer, placement, style_id,
      kind, icon_position, icon_size, icon_color, icon_bg, icon_bg_color, design)
    values (p_store_id, v_name, coalesce(p_active,false), coalesce(p_title,''),
      coalesce(p_tiers,'[]'::jsonb), coalesce(p_footer,''),
      coalesce(p_placement,'{"selector":"","position":"before"}'::jsonb), p_style_id,
      coalesce(x->>'kind','info'), coalesce(x->>'icon_position','left'),
      least(greatest(coalesce((x->>'icon_size')::int,28),0),96),
      nullif(x->>'icon_color',''), coalesce(x->>'icon_bg','none'),
      nullif(x->>'icon_bg_color',''), coalesce(x->'design','{}'::jsonb))
    returning id into v_id;
  else
    update pulse.info_cards set
      name = v_name, active = coalesce(p_active,false), title = coalesce(p_title,''),
      tiers = coalesce(p_tiers,'[]'::jsonb), footer = coalesce(p_footer,''),
      placement = coalesce(p_placement, placement), style_id = p_style_id,
      kind = coalesce(x->>'kind', kind),
      icon_position = coalesce(x->>'icon_position', icon_position),
      icon_size = case when x ? 'icon_size' then least(greatest((x->>'icon_size')::int,0),96) else icon_size end,
      icon_color = case when x ? 'icon_color' then nullif(x->>'icon_color','') else icon_color end,
      icon_bg = coalesce(x->>'icon_bg', icon_bg),
      icon_bg_color = case when x ? 'icon_bg_color' then nullif(x->>'icon_bg_color','') else icon_bg_color end,
      design = coalesce(x->'design', design),
      updated_at = now()
    where id = p_id and store_id = p_store_id returning id into v_id;
    if v_id is null then raise exception 'not_found'; end if;
  end if;
  return (select to_jsonb(c) from pulse.info_cards c where c.id = v_id);
end $$;

create or replace function public.widgets_public_config(p_store_id uuid)
returns jsonb language plpgsql security definer set search_path = public stable as $$
declare v_cards jsonb; v_first jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', c.id, 'kind', c.kind, 'title', c.title, 'tiers', c.tiers, 'footer', c.footer,
      'placement', c.placement, 'icon_position', c.icon_position, 'icon_size', c.icon_size,
      'icon_color', c.icon_color, 'icon_bg', c.icon_bg, 'icon_bg_color', c.icon_bg_color,
      'design', c.design,
      'style', (select s.config from pulse.widget_styles s
                 where s.store_id = c.store_id and s.widget_type = 'ruler'
                   and (s.id = c.style_id or (c.style_id is null and s.is_default))
                 order by (s.id = c.style_id) desc nulls last limit 1)
    ) order by c.created_at), '[]'::jsonb)
  into v_cards from pulse.info_cards c where c.store_id = p_store_id and c.active;
  if jsonb_array_length(v_cards) = 0 then return null; end if;
  select e into v_first from jsonb_array_elements(v_cards) e where e->>'kind' = 'info' limit 1;
  return jsonb_build_object('cards', v_cards, 'ruler', v_first - 'style' - 'id', 'style', v_first -> 'style');
end $$;

revoke all on function public.widgets_card_save(uuid,uuid,text,boolean,text,jsonb,text,jsonb,uuid,jsonb) from public;
grant execute on function public.widgets_card_save(uuid,uuid,text,boolean,text,jsonb,text,jsonb,uuid,jsonb) to authenticated;
grant execute on function public.widgets_public_config(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
