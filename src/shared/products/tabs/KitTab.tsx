import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchProductsForKit } from '../productService';
import type { KitItem, ProductRow } from '../types';
import { brl } from './uiHelpers';

const sb: any = supabase;

interface Props {
  storeId: string;
  productId?: string;
  items: KitItem[];
  onChange: (items: KitItem[]) => void;
  product?: ProductRow;
  onProduct?: (patch: Partial<ProductRow>) => void;
}
type Hit = { id: string; name: string; sku: string | null };
type Var = { id: string; sku: string; label: string; stock: number; price: number | null };
type Info = { id: string; name: string; sku: string | null; price: number | null; cost: number | null; variants: Var[] };

const TH = 'py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400';

export default function KitTab({ storeId, productId, items, onChange, product, onProduct }: Props) {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [info, setInfo] = useState<Record<string, Info>>({});

  useEffect(() => {
    const missing = Array.from(new Set(items.map((i) => i.component_product_id))).filter((id) => !info[id]);
    if (!missing.length) return;
    (async () => {
      const [p, v] = await Promise.all([
        sb.from('products').select('id,name,sku,price,cost_price').in('id', missing),
        sb.from('product_variants').select('id,product_id,sku,title,option_value,stock,price').in('product_id', missing),
      ]);
      const add: Record<string, Info> = {};
      for (const r of p.data ?? []) {
        add[r.id] = {
          id: r.id, name: r.name, sku: r.sku, price: r.price != null ? Number(r.price) : null,
          cost: r.cost_price != null ? Number(r.cost_price) : null,
          variants: (v.data ?? []).filter((x: any) => x.product_id === r.id).map((x: any) => ({
            id: x.id, sku: x.sku, label: x.option_value || x.title || x.sku, stock: Number(x.stock || 0), price: x.price != null ? Number(x.price) : null,
          })),
        };
      }
      setInfo((prev) => ({ ...prev, ...add }));
    })();
  }, [items, info]);

  useEffect(() => {
    if (term.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => { searchProductsForKit(storeId, term).then(setHits).catch(() => setHits([])); }, 300);
    return () => clearTimeout(t);
  }, [term, storeId]);

  const add = (h: Hit) => {
    if (h.id === productId || items.some((i) => i.component_product_id === h.id)) return;
    onChange([...items, { component_product_id: h.id, component_variant_id: null, qty: 1 }]);
    setTerm(''); setHits([]);
  };
  const patch = (idx: number, p: Partial<KitItem>) => onChange(items.map((it, i) => (i === idx ? { ...it, ...p } : it)));

  const calc = items.map((it) => {
    const inf = info[it.component_product_id];
    const variant = inf?.variants.find((v) => v.id === it.component_variant_id);
    const stock = inf ? (variant ? variant.stock : inf.variants.reduce((s, v) => s + v.stock, 0)) : 0;
    const price = variant?.price ?? inf?.price ?? 0;
    const cost = inf?.cost ?? 0;
    return { inf, stock, price, cost, possible: it.qty > 0 ? Math.floor(stock / it.qty) : 0 };
  });
  const sumPrice = calc.reduce((s, c, i) => s + c.price * items[i].qty, 0);
  const sumCost = calc.reduce((s, c, i) => s + c.cost * items[i].qty, 0);
  const kitStock = items.length ? Math.min(...calc.map((c) => c.possible)) : 0;

  return (
    <div className="space-y-5">
      <div className="relative">
        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Adicionar componente (nome ou SKU)</label>
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Digite ao menos 2 letras..." />
        {hits.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#1a1f2c]">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => add(h)} className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className="truncate">{h.name}{h.sku ? ` (${h.sku})` : ''}</span>
                  <Plus size={14} className="shrink-0 text-[color:var(--sll-b-brand)]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">Nenhum componente. Busque acima para montar o kit.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 px-3 dark:bg-[#111524]"><tr>
              <th className={`${TH} pl-4`}>Componente</th><th className={TH}>Variação</th><th className={`${TH} w-24`}>Qtd.</th>
              <th className={`${TH} text-right`}>Unitário</th><th className={`${TH} text-right`}>Subtotal</th><th className={`${TH} text-right`}>Estoque</th><th className="w-10" />
            </tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((it, i) => {
                const c = calc[i];
                return (
                  <tr key={it.component_product_id}>
                    <td className="py-2 pl-4 pr-2"><p className="font-medium">{c.inf?.name ?? '...'}</p>{c.inf?.sku && <p className="text-[10px] text-slate-400">{c.inf.sku}</p>}</td>
                    <td className="py-2 pr-2">
                      {c.inf && c.inf.variants.length > 1 ? (
                        <select value={it.component_variant_id ?? ''} onChange={(e) => patch(i, { component_variant_id: e.target.value || null })}
                          className="h-9 cursor-pointer rounded-xl border border-input bg-transparent px-2 text-xs">
                          <option value="">Qualquer (estoque somado)</option>
                          {c.inf.variants.map((v) => <option key={v.id} value={v.id}>{v.label} ({v.stock})</option>)}
                        </select>
                      ) : <span className="text-xs text-slate-400">—</span>}
                    </td>
                    <td className="py-2 pr-2"><Input type="number" min={1} className="h-9" value={it.qty} onChange={(e) => patch(i, { qty: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} /></td>
                    <td className="py-2 pr-2 text-right font-mono text-xs">{brl(c.price)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-xs font-bold">{brl(c.price * it.qty)}</td>
                    <td className="py-2 pr-2 text-right font-mono text-xs">{c.stock}</td>
                    <td className="py-2 pr-3 text-right"><button type="button" onClick={() => onChange(items.filter((_, x) => x !== i))} className="cursor-pointer text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[['Preço somado', brl(sumPrice)], ['Custo somado', brl(sumCost)], ['Kits possíveis em estoque', String(kitStock)]].map(([l, v]) => (
            <div key={l} className="rounded-xl bg-slate-50 px-4 py-3 dark:bg-[#111524]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{l}</p>
              <p className="mt-0.5 text-lg font-extrabold">{v}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-400">O estoque do kit é calculado pelos componentes (menor quantidade possível).</p>
        {onProduct && items.length > 0 && (
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onProduct({ price: Number(sumPrice.toFixed(2)), cost_price: Number(sumCost.toFixed(2)) })}>
            Usar soma como preço e custo do kit
          </Button>
        )}
      </div>
      {product && product.price != null && items.length > 0 && sumPrice > 0 && product.price < sumPrice && (
        <p className="text-xs font-semibold text-emerald-600">Desconto do kit: {brl(sumPrice - product.price)} ({(((sumPrice - product.price) / sumPrice) * 100).toFixed(1)}%)</p>
      )}
    </div>
  );
}