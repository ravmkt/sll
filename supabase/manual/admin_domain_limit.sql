-- Sincroniza a função com a versão do banco
create or replace function public.enforce_max_custom_domains()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.store_domains
      where store_id = new.store_id and domain <> new.domain)
     >= (select coalesce(max_custom_domains, 1) from public.stores where id = new.store_id) then
    raise exception 'Limite de dominios proprios atingido para esta loja';
  end if;
  return new;
end $$;

-- Libera 5 domínios para a loja dona de promo.sllhub.com.br
update public.stores
set max_custom_domains = 5
where id = (select store_id from public.store_domains where domain = 'promo.sllhub.com.br');

-- Conferência
select s.id, s.max_custom_domains, count(d.id) as dominios_em_uso
from public.stores s
left join public.store_domains d on d.store_id = s.id
where s.id = (select store_id from public.store_domains where domain = 'promo.sllhub.com.br')
group by s.id, s.max_custom_domains;
