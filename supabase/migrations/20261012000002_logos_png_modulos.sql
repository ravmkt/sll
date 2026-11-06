update public.hub_modules set logo_url = '/assets/vidlytics-logo-quadrado.png'    where slug = 'vidlytics';
update public.hub_modules set logo_url = '/assets/stream-sell-logo-quadrado.png'  where slug = 'live_commerce';
update public.hub_modules set logo_url = '/assets/fitmatch-logo-quadrado.png'     where slug in ('provador', 'provador_virtual', 'fitmatch');
update public.hub_modules set logo_url = '/assets/gamifly-logo-quadrado.png'      where slug in ('gamifly', 'gamificacao');
update public.hub_modules set logo_url = '/assets/lucroup-logo-quadrado.png'      where slug in ('lucroup', 'precificacao');

select slug, name, status, logo_url from public.hub_modules order by sort_order;