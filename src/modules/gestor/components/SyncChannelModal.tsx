import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import { listProducts } from '@/services/productsService';
import type { CatalogProduct } from '@/services/productsService';
import { listVariantsByProduct } from '@/components/products/variantsData';
import type { VariantRow } from '@/components/products/variantsData';
import { Modal, inputCls, primaryBtn } from '@/components/products/Modal';
import { pushStockToYampi } from '../services/gestor';
import { CHANNEL_META } from '../services/estoqueCanais';
import { listChannelLinks } from '../services/vinculos';

// Canais com integracao pronta. Para ligar um novo: incluir a key aqui e tratar em syncOne().
const INTEGRATED = new Set(['yampi']);
const CHANNELS = Object.keys(CHANNEL_META).map((key) => ({
  key,
  label: CHANNEL_META[key].label + (INTEGRATED.has(key) ? '' : ' (em breve)'),
  enabled: INTEGRATED.has(key),
}));

type Props = { storeId: string; onClose: () => void };

export default function SyncChannelModal({ storeId, onClose }: Props) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [variants, setVariants] = useState<Map<string, VariantRow[]>>(new Map());
  const [linkMap, setLinkMap] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState('yampi');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([listProducts(storeId), listVariantsByProduct(storeId), listChannelLinks(storeId)])
      .then(([p, v, l]) => {
        setProducts(p);
        setVariants(v);
        setLinkMap(new Map(l.map((x) => [`${x.product_id}|${x.channel}`, x.published])));
      })
      .catch(() => showError('Erro ao carregar produtos.'))
      .finally(() => setLoading(false));
  }, [storeId]);

  const eligible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter((p) =>
      linkMap.has(`${p.id}|${channel}`) && (variants.get(p.id)?.length ?? 0) > 0 &&
      (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)));
  }, [products, variants, linkMap, channel, search]);

  const allPicked = eligible.length > 0 && eligible.every((p) => picked.has(p.id));
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setPicked((s) => {
    const n = new Set(s);
    eligible.forEach((p) => (allPicked ? n.delete(p.id) : n.add(p.id)));
    return n;
  });

  const syncOne = async (key: string, sku: string, stock: number): Promise<'ok' | 'skip' | 'erro'> => {
    if (key === 'yampi') return pushStockToYampi(storeId, sku, stock);
    return 'erro';
  };

  const run = async () => {
    const ids = new Set(eligible.map((p) => p.id));
    const jobs = products.filter((p) => picked.has(p.id) && ids.has(p.id))
      .flatMap((p) => (variants.get(p.id) ?? []).map((v) => ({ sku: v.sku, stock: v.stock })));
    if (!jobs.length) return;
    setBusy(true);
    let ok = 0, skip = 0, fail = 0, i = 0;
    const worker = async () => {
      while (i < jobs.length) {
        const j = jobs[i++];
        try {
          const r = await syncOne(channel, j.sku, j.stock);
          if (r === 'ok') ok++; else if (r === 'skip') skip++; else fail++;
        } catch { fail++; }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    setBusy(false);
    if (ok) showSuccess(`${ok} variação(ões) sincronizada(s).`);
    if (skip) showError(`${skip} variação(ões) ainda não existem no canal. Publique o produto no canal primeiro.`);
    if (fail) showError(`${fail} falha(s) no envio.`);
    if (!fail && !skip) onClose();
  };

  return (
    <Modal title="Sincronizar estoque com canais" onClose={() => { if (!busy) onClose(); }}>
      <div className="space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <select value={channel} onChange={(e) => { setChannel(e.target.value); setPicked(new Set()); }} className={cn(inputCls, 'cursor-pointer sm:!w-64')}>
            {CHANNELS.map((c) => <option key={c.key} value={c.key} disabled={!c.enabled}>{c.label}</option>)}
          </select>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar produto ou SKU..." className={cn(inputCls, 'pl-10')} />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="animate-spin text-[#0094eb]" /></div>
        ) : (
          <div className="max-h-[45vh] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <label className="sticky top-0 flex cursor-pointer items-center gap-3 bg-slate-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:bg-[#111524]">
              <input type="checkbox" checked={allPicked} onChange={toggleAll} className="h-4 w-4 cursor-pointer" />
              Selecionar todos ({eligible.length})
            </label>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {eligible.map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-white/5">
                    <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 cursor-pointer" />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{p.name}</span>
                    {!linkMap.get(`${p.id}|${channel}`) && (
                      <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">não publicado</span>
                    )}
                    <span className="font-mono text-xs text-slate-500">{(variants.get(p.id) ?? []).reduce((s, v) => s + v.stock, 0)} un.</span>
                  </label>
                </li>
              ))}
              {eligible.length === 0 && <li className="px-4 py-8 text-center text-sm text-slate-400">Nenhum produto vinculado a este canal. Vincule na lista de produtos.</li>}
            </ul>
          </div>
        )}

        <p className="text-[11px] text-slate-400">Envia o saldo já salvo (depósito do e-commerce). Alterações pendentes na tela devem ser salvas antes. Produtos "não publicados" só recebem estoque depois de existirem no canal.</p>
        <div className="flex justify-end gap-2">
          <button type="button" disabled={busy} onClick={onClose} className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700">Cancelar</button>
          <button type="button" disabled={busy || picked.size === 0} onClick={() => void run()} className={primaryBtn + ' disabled:opacity-50'}>
            {busy && <Loader2 size={15} className="mr-2 inline animate-spin" />}Sincronizar {picked.size || ''}
          </button>
        </div>
      </div>
    </Modal>
  );
}