import { useCallback, useEffect, useState } from 'react';
import { Plus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createPriceList, listPriceLists } from '../productService';
import type { PriceList, ProductPrice, ProductRow } from '../types';
import { DecimalInput, Field, brl } from './uiHelpers';

interface Props {
  storeId: string;
  product: ProductRow;
  prices: ProductPrice[];
  onProduct: (patch: Partial<ProductRow>) => void;
  onPrices: (prices: ProductPrice[]) => void;
}

export default function PrecosTab({ storeId, product, prices, onProduct, onPrices }: Props) {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setLists((await listPriceLists(storeId)).filter((l) => l.active)); }
    catch (e) { setError((e as Error).message); }
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const priceOf = (listId: string) => prices.find((p) => p.price_list_id === listId && !p.variant_id)?.price ?? null;

  const setPrice = (listId: string, value: number | null) => {
    const rest = prices.filter((p) => !(p.price_list_id === listId && !p.variant_id));
    onPrices(value == null ? rest : [...rest, { price_list_id: listId, variant_id: null, price: value }]);
  };

  const addList = async () => {
    if (!newName.trim()) return;
    try {
      await createPriceList(storeId, newName);
      setNewName('');
      setError(null);
      await load();
    } catch (e) { setError((e as Error).message); }
  };

  const cost = product.cost_price ?? null;
  const sale = product.price ?? null;
  const margin = sale && sale > 0 && cost != null ? ((sale - cost) / sale) * 100 : null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Preço de venda (R$)" hint="Aceita vírgula ou ponto.">
          <DecimalInput value={sale} onChange={(v) => onProduct({ price: v })} placeholder="0,00" />
        </Field>
        <Field label="Preço de custo (R$)">
          <DecimalInput value={cost} onChange={(v) => onProduct({ cost_price: v })} placeholder="0,00" />
        </Field>
        <div className="flex flex-col justify-end pb-1 text-xs text-slate-500">
          {sale != null && cost != null && margin != null
            ? <span>Lucro <strong>{brl(sale - cost)}</strong> · margem <strong>{margin.toFixed(1)}%</strong></span>
            : <span>Informe venda e custo para ver a margem.</span>}
        </div>
      </div>

      {product.format === 'variation' && (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Os valores acima são o padrão do produto. Preços específicos por variação ficam na aba Variações.
        </p>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Listas de preço</p>
        {lists.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma lista cadastrada. Crie a primeira abaixo (ex.: Atacado).</p>}
        {lists.map((l) => {
          const price = priceOf(l.id);
          const m = price && price > 0 && cost != null ? ((price - cost) / price) * 100 : null;
          return (
            <div key={l.id} className="grid grid-cols-12 items-center gap-3">
              <span className="col-span-5 truncate text-sm">{l.name}</span>
              <div className="col-span-4"><DecimalInput value={price} onChange={(v) => setPrice(l.id, v)} placeholder="0,00" /></div>
              <span className="col-span-3 text-xs text-muted-foreground">
                {price != null && cost != null && m != null ? `Lucro ${brl(price - cost)} · ${m.toFixed(1)}%` : '—'}
              </span>
            </div>
          );
        })}
        <div className="flex max-w-md items-end gap-2 pt-2">
          <Field label="Nova lista de preço" className="flex-1">
            <Input value={newName} placeholder="Ex.: Atacado" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addList(); } }} />
          </Field>
          <Button type="button" variant="outline" onClick={() => void addList()}><Plus className="mr-1 h-4 w-4" /> Criar</Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-dashed border-[#0094eb]/40 bg-[#0094eb]/5 p-4">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-[#0094eb]" />
        <div className="text-xs text-slate-600 dark:text-slate-300">
          <p className="font-semibold">Precificação inteligente (módulo Precifica)</p>
          <p className="mt-0.5">Quem assinar o módulo vai receber aqui a sugestão de preço com custos, taxas, impostos e concorrência. Em breve.</p>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}