-- Respostas detalhadas do NPS com contato da loja (somente superadmin)
create or replace function public.admin_nps_responses(p_days int default 90)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_superadmin() then raise exception 'forbidden'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by r.created_at desc) from (
      select f.id, f.created_at, f.score, f.comment, f.payload,
        s.id as store_id, s.name as store_name, s.contact_name::text as contact_name,
        u.email::text as user_email,
        coalesce(nullif(s.contact_email::text,''), nullif(s.owner_contact_email::text,''),
                 nullif(s.store_email::text,''), nullif(s.manager_email::text,''), u.email::text) as email,
        coalesce(nullif(s.whatsapp::text,''), nullif(s.store_whatsapp::text,''),
                 nullif(s.manager_whatsapp::text,''), nullif(s.manager_phone::text,'')) as whatsapp
      from public.app_feedbacks f
      join public.stores s on s.id = f.store_id
      left join auth.users u on u.id = f.user_id
      where f.type = 'nps_wizard'
        and f.created_at >= now() - make_interval(days => greatest(p_days, 1))
      order by f.created_at desc
      limit 500
    ) r
  ), '[]'::jsonb);
end $$;

revoke all on function public.admin_nps_responses(int) from public, anon;
grant execute on function public.admin_nps_responses(int) to authenticated;