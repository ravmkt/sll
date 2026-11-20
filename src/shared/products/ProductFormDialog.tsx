import { useEffect, useState } from 'react';
import { Boxes, ChevronLeft, ChevronRight, DollarSign, FileText, Layers, ListPlus, Loader2, Package, Puzzle, Ruler, Tag, Truck } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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

const PANE = 'mt-0 min-h-0 flex-1 overflow-y-auto px-1 pb-2';

// Identidade visual SLL Hub: cards arredondados, rótulos em caixa alta, abas em pílula azul
const SHELL = [
  'flex h-[85vh] w-full max-w-6xl flex-col gap-4 overflow-hidden rounded-3xl border-slate-200 bg-white p-6 text-slate-900 shadow-xl dark:border-slate-800 dark:bg-[#1a1f2c] dark:text-slate-100',
  '[&_label]:text-[11px] [&_label]:font-bold [&_label]:uppercase [&_label]:tracking-wider [&_label]:text-slate-500',
  '[&_input:not([type=checkbox]):not([type=file]):not([type=radio])]:rounded-2xl [&_select]:rounded-2xl [&_textarea]:rounded-2xl',
].join(' ');
const TRIGGER = [
  'w-full justify-start gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-600 shadow-none dark:bg-[#111524] dark:text-slate-300',
  'data-[state=active]:bg-[#0094eb] data-[state=active]:text-white data-[state=active]:shadow-md',
  'dark:data-[state=active]:bg-[#0094eb] dark:data-[state=active]:text-white',
].join(' ');
const BTN = 'rounded-xl bg-[#0094eb] px-5 font-bold uppercase tracking-wide text-white hover:bg-[#007bc4]';
const BTN_OUT = 'rounded-xl font-bold uppercase tracking-wide';

const TAB_META: Record<string, { label: string; icon: LucideIcon }> = {
  geral: { label: 'Geral', icon: Package },
  catalogo: { label: 'Catálogo', icon: Tag },
  precos: { label: 'Preços', icon: DollarSign },
  dimensoes: { label: 'Dimensões', icon: Ruler },
  estoque: { label: 'Estoque', icon: Boxes },
  fornecedores: { label: 'Fornecedores', icon: Truck },
  tributacao: { label: 'Tributação', icon: FileText },
  extras: { label: 'Campos extras', icon: ListPlus },
  variacoes: { label: 'Variações', icon: Layers },
  composicao: { label: 'Composição', icon: Puzzle },
};

export default function ProductFormDialog({ open, onOpenChange, storeId, productId, onSaved }: Props) {
  const [draft, setDraft] = useState<ProductDraft>(blankDraft);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [tab, setTab] = useState('geral');
  const [guided, setGuided] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setErrors([]);
    setTab('geral');
    setSavedId(null);
    setGuided(!productId);
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

  // Criação = passo a passo (pode sair clicando em qualquer aba). Edição = livre.
  const currentId = savedId ?? productId ?? null;
  const isCreate = !currentId;
  const steps = available.filter((t) => t !== 'variacoes');
  const idx = steps.indexOf(current);
  const showNext = guided && isCreate && idx >= 0 && idx < steps.length - 1;

  const goNext = () => {
    if (current === 'geral' && !draft.product.name.trim()) {
      setErrors(['Informe o nome do produto para avançar.']);
      return;
    }
    setErrors([]);
    setTab(steps[idx + 1]);
  };

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
      if (isCreate && format === 'variation') {
        // mantém o modal aberto para criar as variações do produto já salvo
        setSavedId(id);
        patchProduct({ id } as Partial<ProductRow>);
        setGuided(false);
        setTab('variacoes');
        return;
      }
      onOpenChange(false);
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={SHELL}>
        <DialogHeader className="shrink-0 pr-8">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="text-xl font-extrabold tracking-tight">{isCreate ? 'Novo produto' : 'Editar produto'}</DialogTitle>
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => patchProduct({ active: !isActive })}
              className="flex cursor-pointer items-center gap-2 text-[11px] font-bold uppercase tracking-wider"
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
          <Tabs value={current} onValueChange={(v) => { setTab(v); setGuided(false); }} className="flex min-h-0 flex-1 gap-6">
            <TabsList className="flex h-auto w-52 shrink-0 flex-col items-stretch justify-start gap-1.5 self-start bg-transparent p-0">
              {available.map((v) => {
                const Icon = TAB_META[v].icon;
                return (
                  <TabsTrigger key={v} value={v} className={TRIGGER}>
                    <Icon size={14} />
                    {TAB_META[v].label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            <TabsContent value="geral" className={PANE}>
              <GeralTab storeId={storeId} product={draft.product} onChange={patchProduct} />
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
                <VariationsTab storeId={storeId} productId={currentId} product={draft.product} />
              </TabsContent>
            )}
            {format === 'kit' && (
              <TabsContent value="composicao" className={PANE}>
                <KitTab
                  storeId={storeId}
                  productId={currentId ?? undefined}
                  product={draft.product}
                  onProduct={patchProduct}
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

        <DialogFooter className="shrink-0 items-center gap-2 sm:justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {guided && isCreate && idx >= 0 ? `Passo ${idx + 1} de ${steps.length}` : ''}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" className={BTN_OUT} onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
            {guided && isCreate && idx > 0 && (
              <Button variant="outline" className={BTN_OUT} onClick={() => setTab(steps[idx - 1])} disabled={saving}>
                <ChevronLeft className="mr-1 h-4 w-4" />Voltar
              </Button>
            )}
            {showNext ? (
              <Button className={BTN} onClick={goNext}>
                Avançar<ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <Button className={BTN} onClick={() => void handleSave()} disabled={saving || loading}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isCreate && format === 'variation' ? 'Salvar e criar variações' : 'Salvar'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}