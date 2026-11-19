-- yampi_apply_tokens com opcao de preservar estoque (modo gestor_master)
drop function if exists public.yampi_apply_tokens(uuid, jsonb);

create or replace function public.yampi_apply_tokens(p_store uuid, p_items jsonb, p_keep_stock boolean default false)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.product_variants v
  set checkout_token = i.token, purchase_url = i.url
  from jsonb_to_recordset(p_items) as i(ext text, token text, url text, stock integer)
  where v.store_id = p_store
    and v.external_id::text = i.ext
    and (v.checkout_token, v.purchase_url) is distinct from (i.token, i.url);

  update public.products p
  set checkout_token = i.token,
      purchase_url = i.url,
      stock_qty = case when p_keep_stock then p.stock_qty else i.stock end
  from jsonb_to_recordset(p_items) as i(ext text, token text, url text, stock integer)
  where p.store_id = p_store
    and p.external_id::text = i.ext
    and (p.checkout_token, p.purchase_url, p.stock_qty)
        is distinct from (i.token, i.url, case when p_keep_stock then p.stock_qty else i.stock end);
end $$;

revoke all on function public.yampi_apply_tokens(uuid, jsonb, boolean) from public, anon, authenticated;
grant execute on function public.yampi_apply_tokens(uuid, jsonb, boolean) to service_role;

notify pgrst, 'reload schema';

select 'yampi_apply_tokens' as item, count(*)::text as valor
from pg_proc where proname = 'yampi_apply_tokens';