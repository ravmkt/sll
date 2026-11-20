do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_suppliers_supplier_id_fkey'
  ) then
    alter table public.product_suppliers
      add constraint product_suppliers_supplier_id_fkey
      foreign key (supplier_id) references erp.suppliers(id) on delete set null;
  end if;
end $$;

select conname, pg_get_constraintdef(oid) as definicao
from pg_constraint
where conname = 'product_suppliers_supplier_id_fkey';
