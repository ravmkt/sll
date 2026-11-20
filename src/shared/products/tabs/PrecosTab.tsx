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

const CARD = 'rounded-2xl border border-slate-200 p-5 dark:border-slate-800';
const TITLE = 'mb-4 text-[11px] font-bold uppercase tracking-wider text-slate-500';

function Stat({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'bad' }) {
  return (
    <div className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-[#111524]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-extrabold ${tone === 'bad' ? 'text-rose-500' : tone === 'ok' ? 'text-emerald-600' : 'text-slate-800 dark:text-white'}`}>{value}</p>
    </div>
  );
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
    try { await createPriceList(storeId, newName); setNewName(''); setError(null); await load(); }
    catch (e) { setError((e as Error).message); }
  };

  const cost = product.cost_price ?? null;
  const sale = product.price ?? null;
  const profit = sale != null && cost != null ? sale - cost : null;
  const margin = sale && sale > 0 && cost != null ? ((sale - cost) / sale) * 100 : null;

  return (
    <div className="space-y-5">
      <section className={CARD}>
        <h3 className={TITLE}>Preço padrão</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Preço de venda (R$)" hint="Aceita vírgula ou ponto.">
            <DecimalInput value={sale} onChange={(v) => onProduct({ price: v })} placeholder="0,00" />
          </Field>
          <Field label="Preço de custo (R$)">
            <DecimalInput value={cost} onChange={(v) => onProduct({ cost_price: v })} placeholder="0,00" />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Stat label="Lucro bruto" value={profit != null ? brl(profit) : '—'} tone={profit == null ? undefined : profit >= 0 ? 'ok' : 'bad'} />
          <Stat label="Margem" value={margin != null ? `${margin.toFixed(1)}%` : '—'} tone={margin == null ? undefined : margin >= 0 ? 'ok' : 'bad'} />
        </div>
        {product.format === 'variation' && (
          <p className="mt-3 text-[11px] text-slate-400">Este é o preço padrão. O preço de cada variação é definido na aba Variações.</p>
        )}
      </section>

      <section className={CARD}>
        <h3 className={TITLE}>Listas de preço</h3>
        {lists.length === 0 ? (
          <p className="mb-4 text-sm text-slate-400">Nenhuma lista cadastrada. Crie a primeira abaixo (ex.: Atacado).</p>
        ) : (
          <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-12 gap-3 bg-slate-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:bg-[#111524]">
              <span className="col-span-4">Lista</span>
              <span className="col-span-4">Preço (R$)</span>
              <span className="col-span-2 text-right">Lucro bruto</span>
              <span className="col-span-2 text-right">Margem</span>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {lists.map((l) => {
                const price = priceOf(l.id);
                const profitL = price != null && cost != null ? price - cost : null;
                const m = price && price > 0 && cost != null ? ((price - cost) / price) * 100 : null;
                return (
                  <div key={l.id} className="grid grid-cols-12 items-center gap-3 px-4 py-2.5">
                    <span className="col-span-4 truncate text-sm font-medium">{l.name}</span>
                    <div className="col-span-4"><DecimalInput value={price} onChange={(v) => setPrice(l.id, v)} placeholder="0,00" /></div>
                    <span className="col-span-2 text-right text-xs text-slate-600 dark:text-slate-300">{profitL != null ? brl(profitL) : '—'}</span>
                    <span className="col-span-2 text-right text-xs font-semibold text-slate-600 dark:text-slate-300">{m != null ? `${m.toFixed(1)}%` : '—'}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex items-end gap-2">
          <Field label="Nova lista de preço" className="max-w-sm flex-1">
            <Input value={newName} placeholder="Ex.: Atacado" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addList(); } }} />
          </Field>
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => void addList()}><Plus className="mr-1 h-4 w-4" /> Criar</Button>
        </div>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-dashed border-[#0094eb]/40 bg-[#0094eb]/5 p-4">
        <Sparkles size={18} className="mt-0.5 shrink-0 text-[#0094eb]" />
        <p className="text-xs text-slate-600 dark:text-slate-300">
          <strong>Precificação inteligente (módulo Precifica):</strong> sugestão de preço com custos, taxas, impostos e concorrência. Em breve.
        </p>
      </div>
    </div>
  );
}