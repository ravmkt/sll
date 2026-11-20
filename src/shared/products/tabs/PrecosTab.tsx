import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPriceList, listPriceLists } from '../productService';
import type { PriceList, ProductPrice, ProductRow } from '../types';
import { brl, numStr, toNum } from './fieldUtils';

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

  const priceOf = (listId: string) =>
    prices.find((p) => p.price_list_id === listId && !p.variant_id)?.price ?? null;

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

  return (
    <div className="space-y-5">
      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="p-cost">Preço de custo (R$)</Label>
        <Input
          id="p-cost" inputMode="decimal"
          value={numStr(cost)}
          onChange={(e) => onProduct({ cost_price: toNum(e.target.value) })}
        />
      </div>

      {product.format === 'variation' && (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Os valores abaixo são o padrão do produto. Preços específicos por variação ficam na aba Variações.
        </p>
      )}

      <div className="space-y-2">
        <Label>Listas de preço</Label>
        {lists.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma lista cadastrada. Crie a primeira abaixo (ex.: Varejo, Atacado).</p>
        )}
        {lists.map((l) => {
          const price = priceOf(l.id);
          const margin = price && price > 0 && cost != null ? ((price - cost) / price) * 100 : null;
          return (
            <div key={l.id} className="grid grid-cols-12 items-center gap-3">
              <span className="col-span-5 truncate text-sm">{l.name}</span>
              <Input
                className="col-span-4" inputMode="decimal" placeholder="0,00"
                value={numStr(price)}
                onChange={(e) => setPrice(l.id, toNum(e.target.value))}
              />
              <span className="col-span-3 text-xs text-muted-foreground">
                {price != null && cost != null && margin != null
                  ? `Lucro ${brl(price - cost)} · ${margin.toFixed(1)}%`
                  : '—'}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex max-w-md items-end gap-2">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="p-newlist">Nova lista de preço</Label>
          <Input
            id="p-newlist" value={newName} placeholder="Ex.: Atacado"
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addList(); } }}
          />
        </div>
        <Button type="button" variant="outline" onClick={() => void addList()}>
          <Plus className="mr-1 h-4 w-4" /> Criar
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
