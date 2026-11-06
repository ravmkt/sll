alter table public.products
  add column if not exists checkout_token text,
  add column if not exists purchase_url text,
  add column if not exists stock_qty integer;

alter table public.product_variants
  add column if not exists checkout_token text,
  add column if not exists purchase_url text;

create or replace function public.yampi_apply_tokens(p_store uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.product_variants v
  set checkout_token = i.token, purchase_url = i.url
  from jsonb_to_recordset(p_items) as i(ext text, token text, url text, stock integer)
  where v.store_id = p_store
    and v.external_id::text = i.ext
    and (v.checkout_token, v.purchase_url) is distinct from (i.token, i.url);

  update public.products p
  set checkout_token = i.token, purchase_url = i.url, stock_qty = i.stock
  from jsonb_to_recordset(p_items) as i(ext text, token text, url text, stock integer)
  where p.store_id = p_store
    and p.external_id::text = i.ext
    and (p.checkout_token, p.purchase_url, p.stock_qty) is distinct from (i.token, i.url, i.stock);
end
$$;

revoke all on function public.yampi_apply_tokens(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.yampi_apply_tokens(uuid, jsonb) to service_role;