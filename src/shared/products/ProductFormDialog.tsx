import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { emptyProduct, getProductFull, saveProduct, validateDraft } from './productService';
import type { ProductDraft, ProductRow } from './types';
import GeralTab from './tabs/GeralTab';
import PrecosTab from './tabs/PrecosTab';
import DescricaoMidiaTab from './tabs/DescricaoMidiaTab';
import DimensoesTab from './tabs/DimensoesTab';
import EstoqueTab from './tabs/EstoqueTab';
import FornecedoresTab from './tabs/FornecedoresTab';
import TaxTab from './tabs/TaxTab';
import CustomFieldsTab from './tabs/CustomFieldsTab';
import KitTab from './tabs/KitTab';
import VariationsTab from './tabs/VariationsTab';
import CatalogoTab from './tabs/CatalogoTab';

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
  const [tab, setTab] = useState('geral');

  useEffect(() => {
    if (!open) return;
    setErrors([]);
    setTab('geral');
    if (!productId) { setDraft(blankDraft()); return; }
    setLoading(true);
    getProductFull(storeId, productId)
      .then(setDraft)
      .catch((e: Error) => setErrors([e.message]))
      .finally(() => setLoading(false));
  }, [open, productId, storeId]);

  const patchProduct = (patch: Partial<ProductRow>) =>
    setDraft((d) => ({ ...d, product: { ...d.product, ...patch } }));

  const format = draft.product.format;
  const available = [
    'geral', 'catalogo', 'precos', 'midia', 'dimensoes', 'estoque', 'fornecedores', 'tributacao', 'extras',
    ...(format === 'variation' ? ['variacoes'] : []),
    ...(format === 'kit' ? ['composicao'] : []),
  ];
  const current = available.includes(tab) ? tab : 'geral';

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
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{productId ? 'Editar produto' : 'Novo produto'}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs value={current} onValueChange={setTab}>
            <TabsList className="flex h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
              <TabsTrigger value="precos">Preços</TabsTrigger>
              <TabsTrigger value="midia">Descrição e mídia</TabsTrigger>
              <TabsTrigger value="dimensoes">Dimensões</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
              <TabsTrigger value="tributacao">Tributação</TabsTrigger>
              <TabsTrigger value="extras">Campos extras</TabsTrigger>
              {format === 'variation' && <TabsTrigger value="variacoes">Variações</TabsTrigger>}
              {format === 'kit' && <TabsTrigger value="composicao">Composição</TabsTrigger>}
            </TabsList>

            <TabsContent value="geral" className="pt-4">
              <GeralTab product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="catalogo" className="pt-4">
              <CatalogoTab storeId={storeId} product={draft.product} onChange={patchProduct} />
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
            <TabsContent value="dimensoes" className="pt-4">
              <DimensoesTab product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="estoque" className="pt-4">
              <EstoqueTab product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="fornecedores" className="pt-4">
              <FornecedoresTab
                storeId={storeId}
                suppliers={draft.suppliers}
                onChange={(suppliers) => setDraft((d) => ({ ...d, suppliers }))}
              />
            </TabsContent>
            <TabsContent value="tributacao" className="pt-4">
              <TaxTab product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="extras" className="pt-4">
              <CustomFieldsTab storeId={storeId} product={draft.product} onChange={patchProduct} />
            </TabsContent>
            {format === 'variation' && (
              <TabsContent value="variacoes" className="pt-4">
                <VariationsTab storeId={storeId} productId={productId} product={draft.product} />
              </TabsContent>
            )}
            {format === 'kit' && (
              <TabsContent value="composicao" className="pt-4">
                <KitTab
                  storeId={storeId}
                  productId={productId ?? undefined}
                  items={draft.kitItems}
                  onChange={(kitItems) => setDraft((d) => ({ ...d, kitItems }))}
                />
              </TabsContent>
            )}
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
