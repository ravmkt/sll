import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { searchProductsForKit } from '../productService';
import type { KitItem } from '../types';

interface Props { storeId: string; productId?: string; items: KitItem[]; onChange: (items: KitItem[]) => void }
type Hit = { id: string; name: string; sku: string | null };

export default function KitTab({ storeId, productId, items, onChange }: Props) {
  const [term, setTerm] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const missing = items.map((i) => i.component_product_id).filter((id) => !names[id]);
    if (!missing.length) return;
    supabase.from('products').select('id, name, sku').in('id', missing).then(({ data }) => {
      if (!data) return;
      setNames((p) => ({ ...p, ...Object.fromEntries(data.map((d) => [d.id, d.name + (d.sku ? ` (${d.sku})` : '')])) }));
    });
  }, [items, names]);

  useEffect(() => {
    if (term.trim().length < 2) { setHits([]); return; }
    const t = setTimeout(() => {
      searchProductsForKit(storeId, term).then(setHits).catch(() => setHits([]));
    }, 300);
    return () => clearTimeout(t);
  }, [term, storeId]);

  const add = (h: Hit) => {
    if (h.id === productId || items.some((i) => i.component_product_id === h.id)) return;
    setNames((p) => ({ ...p, [h.id]: h.name + (h.sku ? ` (${h.sku})` : '') }));
    onChange([...items, { component_product_id: h.id, qty: 1 }]);
    setTerm(''); setHits([]);
  };
  const setQty = (idx: number, qty: number) =>
    onChange(items.map((it, i) => (i === idx ? { ...it, qty: Math.max(1, Math.floor(qty) || 1) } : it)));

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="mb-1 block text-xs font-semibold text-slate-500">Adicionar componente (nome ou SKU)</label>
        <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Digite ao menos 2 letras..." />
        {hits.length > 0 && (
          <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-[#1a1f2c]">
            {hits.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => add(h)} className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-white/5">
                  <span className="truncate">{h.name}{h.sku ? ` (${h.sku})` : ''}</span>
                  <Plus size={14} className="shrink-0 text-[#0094eb]" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">Nenhum componente. Busque acima para montar o kit.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400"><tr><th className="py-2">Componente</th><th className="w-28 py-2">Qtd.</th><th className="w-10" /></tr></thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((it, i) => (
              <tr key={it.component_product_id}>
                <td className="py-2 pr-2 font-medium">{names[it.component_product_id] || '...'}</td>
                <td className="py-2"><Input type="number" min={1} value={it.qty} onChange={(e) => setQty(i, Number(e.target.value))} /></td>
                <td className="py-2 text-right"><button type="button" onClick={() => onChange(items.filter((_, x) => x !== i))} className="text-slate-400 hover:text-rose-500"><Trash2 size={15} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p className="text-xs text-slate-400">O estoque do kit é calculado pelos componentes.</p>
    </div>
  );
}
