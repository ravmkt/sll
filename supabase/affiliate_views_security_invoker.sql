begin;

-- Ativar security_invoker nas views de afiliados e fechar anon
alter view public.affiliate_dashboard_summary set (security_invoker = true);
alter view public.affiliate_referred_details  set (security_invoker = true);

revoke all on public.affiliate_dashboard_summary from anon, authenticated;
revoke all on public.affiliate_referred_details  from anon, authenticated;

grant select on public.affiliate_dashboard_summary to authenticated;
grant select on public.affiliate_referred_details  to authenticated;

-- Remover permissões perigosas de escrita das views públicas
revoke insert, update, delete, truncate, references, trigger
on public.comments_public, 
   public.public_live_settings,
   public.store_settings_public, 
   public.stores_public,
   public.vid_videos,
   public.vidlytics_appearances
from anon, authenticated;

commit;
