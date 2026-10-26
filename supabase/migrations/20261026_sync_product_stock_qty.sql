-- Mantem products.stock_qty = soma de product_variants.stock (widget anon nao le variantes)
CREATE OR REPLACE FUNCTION public.sync_product_stock_qty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pid public.products.id%TYPE;
BEGIN
  pid := COALESCE(NEW.product_id, OLD.product_id);
  UPDATE public.products
     SET stock_qty = (SELECT COALESCE(SUM(stock), 0)::int
                        FROM public.product_variants
                       WHERE product_id = pid)
   WHERE id = pid;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_product_stock_qty ON public.product_variants;
CREATE TRIGGER trg_sync_product_stock_qty
AFTER INSERT OR DELETE OR UPDATE OF stock, product_id ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.sync_product_stock_qty();

UPDATE public.products p
   SET stock_qty = s.total
  FROM (SELECT product_id, COALESCE(SUM(stock), 0)::int AS total
          FROM public.product_variants
         GROUP BY product_id) s
 WHERE s.product_id = p.id;

NOTIFY pgrst, 'reload schema';
