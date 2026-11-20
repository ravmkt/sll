import { VariantsPanel } from '@/components/products/ProductVariants';
import type { ProductRow } from '../types';

interface Props { storeId: string; productId?: string | null; product: ProductRow }

export default function VariationsTab({ storeId, productId, product }: Props) {
  if (!productId) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
        Salve o produto primeiro. Depois, reabra para ver e gerenciar as variações.
      </p>
    );
  }
  return (
    <VariantsPanel
      storeId={storeId}
      product={{ id: productId, name: product.name, origin: (product.origin as string | null | undefined) ?? null }}
    />
  );
}
