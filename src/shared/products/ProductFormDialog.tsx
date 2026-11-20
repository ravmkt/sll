import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { emptyProduct, getProductFull, saveProduct, validateDraft } from './productService';
import type { ProductDraft, ProductRow } from './types';
import GeralTab from './tabs/GeralTab';
import CatalogoTab from './tabs/CatalogoTab';
import PrecosTab from './tabs/PrecosTab';
import DimensoesTab from './tabs/DimensoesTab';
import EstoqueTab from './tabs/EstoqueTab';
import FornecedoresTab from './tabs/FornecedoresTab';
import TaxTab from './tabs/TaxTab';
import CustomFieldsTab from './tabs/CustomFieldsTab';
import KitTab from './tabs/KitTab';
import VariationsTab from './tabs/VariationsTab';
import { DESCRIPTION_LIMIT } from './tabs/uiHelpers';

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

const PANE = 'mt-0 min-h-0 flex-1 overflow-y-auto px-1 pb-2 pt-4';

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
  const isActive = draft.product.active !== false;
  const available = [
    'geral', 'catalogo', 'precos', 'dimensoes', 'estoque', 'fornecedores', 'tributacao', 'extras',
    ...(format === 'variation' ? ['variacoes'] : []),
    ...(format === 'kit' ? ['composicao'] : []),
  ];
  const current = available.includes(tab) ? tab : 'geral';

  const handleSave = async () => {
    const problems = validateDraft(draft);
    if ((draft.product.description ?? '').length > DESCRIPTION_LIMIT) {
      problems.push(`A descrição passou de ${DESCRIPTION_LIMIT.toLocaleString('pt-BR')} caracteres.`);
    }
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
      <DialogContent className="flex h-[85vh] w-full max-w-4xl flex-col gap-3 overflow-hidden bg-white text-slate-900 dark:bg-[#1a1f2c] dark:text-slate-100">
        <DialogHeader className="shrink-0 pr-8">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>{productId ? 'Editar produto' : 'Novo produto'}</DialogTitle>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => patchProduct({ active: !isActive })}
              className="flex cursor-pointer items-center gap-2 text-xs font-semibold"
            >
              <span className={cn('relative h-5 w-9 rounded-full transition-colors', isActive ? 'bg-emerald-500' : 'bg-slate-300')}>
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', isActive ? 'left-[18px]' : 'left-0.5')} />
              </span>
              {isActive ? 'Ativo' : 'Desativado'}
            </button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Tabs value={current} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="flex h-auto shrink-0 flex-wrap justify-start gap-1">
              <TabsTrigger value="geral">Geral</TabsTrigger>
              <TabsTrigger value="catalogo">Catálogo</TabsTrigger>
              <TabsTrigger value="precos">Preços</TabsTrigger>
              <TabsTrigger value="dimensoes">Dimensões</TabsTrigger>
              <TabsTrigger value="estoque">Estoque</TabsTrigger>
              <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
              <TabsTrigger value="tributacao">Tributação</TabsTrigger>
              <TabsTrigger value="extras">Campos extras</TabsTrigger>
              {format === 'variation' && <TabsTrigger value="variacoes">Variações</TabsTrigger>}
              {format === 'kit' && <TabsTrigger value="composicao">Composição</TabsTrigger>}
            </TabsList>

            <TabsContent value="geral" className={PANE}>
              <GeralTab product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="catalogo" className={PANE}>
              <CatalogoTab storeId={storeId} product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="precos" className={PANE}>
              <PrecosTab
                storeId={storeId}
                product={draft.product}
                prices={draft.prices}
                onProduct={patchProduct}
                onPrices={(prices) => setDraft((d) => ({ ...d, prices }))}
              />
            </TabsContent>
            <TabsContent value="dimensoes" className={PANE}>
              <DimensoesTab product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="estoque" className={PANE}>
              <EstoqueTab storeId={storeId} product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="fornecedores" className={PANE}>
              <FornecedoresTab
                storeId={storeId}
                suppliers={draft.suppliers}
                onChange={(suppliers) => setDraft((d) => ({ ...d, suppliers }))}
              />
            </TabsContent>
            <TabsContent value="tributacao" className={PANE}>
              <TaxTab product={draft.product} onChange={patchProduct} />
            </TabsContent>
            <TabsContent value="extras" className={PANE}>
              <CustomFieldsTab storeId={storeId} product={draft.product} onChange={patchProduct} />
            </TabsContent>
            {format === 'variation' && (
              <TabsContent value="variacoes" className={PANE}>
                <VariationsTab storeId={storeId} productId={productId} product={draft.product} />
              </TabsContent>
            )}
            {format === 'kit' && (
              <TabsContent value="composicao" className={PANE}>
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
          <ul className="shrink-0 list-disc space-y-0.5 rounded-md bg-destructive/10 px-6 py-2 text-sm text-destructive">
            {errors.map((e) => <li key={e}>{e}</li>)}
          </ul>
        )}

        <DialogFooter className="shrink-0">
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