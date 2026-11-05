create table if not exists public.noah_support_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null,
  kind text not null check (kind in ('human_request', 'daily_limit', 'cooldown', 'whatsapp_click')),
  created_at timestamptz not null default now()
);
create index if not exists noah_support_events_idx on public.noah_support_events (created_at desc, kind);
alter table public.noah_support_events enable row level security;
revoke all on public.noah_support_events from anon, authenticated;
grant all on public.noah_support_events to service_role;

create or replace function public.noah_log_support_event(p_store uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_kind <> 'whatsapp_click' then raise exception 'invalid_kind'; end if;
  if not exists (select 1 from public.stores s where s.id = p_store and s.owner_user_id = auth.uid()) then
    raise exception 'forbidden';
  end if;
  insert into public.noah_support_events (store_id, kind) values (p_store, p_kind);
end $$;
revoke all on function public.noah_log_support_event(uuid, text) from public, anon;
grant execute on function public.noah_log_support_event(uuid, text) to authenticated;

create or replace function public.admin_noah_themes(p_days integer default 30, p_start date default null, p_end date default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_from timestamptz;
  v_to timestamptz;
  r jsonb;
begin
  if not public.is_superadmin() then raise exception 'forbidden' using errcode = '42501'; end if;

  if p_start is not null and p_end is not null then
    v_from := (p_start::text || ' 00:00:00-03')::timestamptz;
    v_to := ((p_end + 1)::text || ' 00:00:00-03')::timestamptz;
  else
    v_from := now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
    v_to := now() + interval '1 minute';
  end if;

  with q as (
    select l.store_id, l.finish_reason, l.created_at, left(l.user_message, 80) as msg,
           translate(lower(coalesce(l.user_message, '')), 'áàâãäéèêíìóòôõöúùûç', 'aaaaaeeeiiooooouuuc') as t
    from public.noah_logs l
    where l.created_at >= v_from and l.created_at < v_to and l.user_message is not null
  ), th as (
    select msg, created_at,
      case
        when t ~ '^(oi+|ola+|opa|eae|hey|bom dia|boa tarde|boa noite|tudo bem)[ !.?]*$' then 'Saudacao'
        when t ~ 'video|stor(y|ies)|vidlytics|widget|biblioteca|aparencia|instagram|tiktok' then 'Videos e Stories'
        when t ~ '\mlive|stre+a?m ?sell|transmiss|cupom' then 'Stream Sell'
        when t ~ 'script|gtm|tag manager|instal|integra' then 'Instalacao e Script'
        when t ~ 'plano|assinatura|cobranca|pagamento|preco|cancel|fatura|nota fiscal' then 'Planos e Cobranca'
        when t ~ 'produto|catalogo|xml|planilha|yampi|medida' then 'Produtos'
        when t ~ 'clube|afiliad|indica|comiss' then 'Clube SLL'
        when t ~ 'suporte|atendente|humano|whatsapp|prazo|quanto tempo' then 'Suporte e prazos'
        else 'Outros'
      end as tema
    from q
  )
  select jsonb_build_object(
    'perguntas', (select count(*) from q),
    'truncadas', (select count(*) from q where finish_reason = 'MAX_TOKENS'),
    'temas', coalesce((select jsonb_agg(jsonb_build_object('tema', x.tema, 'qtd', x.n) order by x.n desc)
                       from (select tema, count(*) as n from th group by 1) x), '[]'::jsonb),
    'amostra_outros', coalesce((select jsonb_agg(jsonb_build_object('texto', y.msg, 'quando', y.created_at))
                                from (select msg, created_at from th where tema = 'Outros' order by created_at desc limit 10) y), '[]'::jsonb),
    'quedas_por_tipo', coalesce((select jsonb_agg(jsonb_build_object('kind', z.kind, 'qtd', z.n) order by z.n desc)
                                 from (select kind, count(*) as n from public.noah_support_events e
                                       where e.created_at >= v_from and e.created_at < v_to group by 1) z), '[]'::jsonb),
    'quedas_por_loja', coalesce((select jsonb_agg(jsonb_build_object('loja', w.loja, 'qtd', w.n) order by w.n desc)
                                 from (select coalesce(s.name, 'Sem loja') as loja, count(*) as n
                                       from public.noah_support_events e left join public.stores s on s.id = e.store_id
                                       where e.created_at >= v_from and e.created_at < v_to
                                       group by 1 order by 2 desc limit 8) w), '[]'::jsonb)
  ) into r;

  return r;
end $$;
revoke all on function public.admin_noah_themes(integer, date, date) from public, anon;
grant execute on function public.admin_noah_themes(integer, date, date) to authenticated;
notify pgrst, 'reload schema';

select proname from pg_proc where proname in ('admin_noah_themes', 'noah_log_support_event') order by 1;