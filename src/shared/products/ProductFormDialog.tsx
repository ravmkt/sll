import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { emptyProduct, getProductFull, saveProduct, validateDraft } from './productService';
import type { ProductDraft, ProductRow } from './types';
import DescricaoMidiaTab from './tabs/DescricaoMidiaTab';
import GeralTab from './tabs/GeralTab';
import PrecosTab from './tabs/PrecosTab';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string;
  productId?: string | null;
  onSaved?: (productId: string) => void;
}

const blankDraft = (): ProductDraft => ({
  product: emptyProduct(), prices: [], suppliers: [], kitItems: [],
});

export default function ProductFormDialog({ open, onOpenChange, storeId, productId, onSaved }: Props) {
  const [draft, setDraft] = useState<ProductDraft>(blankDraft);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setErrors([]);
    if (!productId) { setDraft(blankDraft()); return; }
    setLoading(true);
    getProductFull(storeId, productId)
      .then(setDraft)
      .catch((e: Error) => setErrors([e.message]))
      .finally(() => setLoading(false));
  }, [open, productId, storeId]);

  const patchProduct = (patch: Partial<ProductRow>) =>
    setDraft((d) => ({ ...d, product: { ...d.product, ...patch } }));

  const handleSave = async () => {
    const problems = validateDraft(draft);
    if (problems.length) { setErrors(problems); return; }
    setSaving(true);
    try {
      const id = await saveProduct(storeId, draft);
      onSaved?.(id);
      onOpenChange(false);
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productId ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs defaultValue="geral">
            <TabsList>
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="precos">Preços</TabsTrigger>
              <TabsTrigger value="midia">Descrição e mídia</TabsTrigger>
            </TabsList>
            <TabsContent value="geral" className="pt-4">
              <GeralTab product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="precos" className="pt-4">
              <PrecosTab
                storeId={storeId}
                product={draft.product}
                prices={draft.prices}
                onProduct={patchProduct}
                onPrices={(prices) => setDraft((d) => ({ ...d, prices }))}
              />
            </TabsContent>
            <TabsContent value="midia" className="pt-4">
              <DescricaoMidiaTab product={draft.product} onChange={patchProduct} />
            </TabsContent>
          </Tabs>
        )}

        {errors.length > 0 && (
          <ul className="list-disc space-y-0.5 rounded-md bg-destructive/10 px-6 py-2 text-sm text-destructive">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={() => void handleSave()} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
