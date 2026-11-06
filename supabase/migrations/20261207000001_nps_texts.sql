create table if not exists public.admin_nps_texts (
  key text primary key check (key in ('invite_title','score_question','step2_description','pain_title','feature_title','comment_question','comment_placeholder')),
  value text not null check (char_length(btrim(value)) between 1 and 200),
  updated_at timestamptz not null default now()
);
alter table public.admin_nps_texts enable row level security;
revoke all on public.admin_nps_texts from anon, authenticated;

create or replace function public.get_nps_texts()
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;
  return coalesce((select jsonb_object_agg(key, value) from public.admin_nps_texts), '{}'::jsonb);
end $$;

create or replace function public.admin_nps_save_texts(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  if p is null or jsonb_typeof(p) <> 'object' then raise exception 'invalid_payload'; end if;
  for r in select * from jsonb_each_text(p) loop
    if r.key not in ('invite_title','score_question','step2_description','pain_title','feature_title','comment_question','comment_placeholder') then
      raise exception 'invalid_key';
    end if;
    if btrim(r.value) = '' then
      delete from public.admin_nps_texts where key = r.key;
    else
      insert into public.admin_nps_texts (key, value) values (r.key, left(btrim(r.value), 200))
      on conflict (key) do update set value = excluded.value, updated_at = now();
    end if;
  end loop;
end $$;

revoke all on function public.get_nps_texts() from public, anon;
revoke all on function public.admin_nps_save_texts(jsonb) from public, anon;
grant execute on function public.get_nps_texts() to authenticated;
grant execute on function public.admin_nps_save_texts(jsonb) to authenticated;