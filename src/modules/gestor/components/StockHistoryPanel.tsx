import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';

const sb: any = supabase;
const PAGE = 50;

const TYPE_LABEL: Record<string, string> = {
  initial: 'Saldo inicial',
  purchase: 'Compra',
  sale: 'Venda',
  return: 'Devolução',
  adjustment: 'Ajuste',
  loss: 'Perda',
};

const CHANNEL_LABEL: Record<string, string> = {
  gestor: 'Gestor',
  direct: 'Alteração direta',
  transfer: 'Transferência',
  yampi: 'Yampi',
  pdv: 'PDV',
};

type Row = {
  id: string;
  created_at: string;
  type: string;
  qty: number;
  balance_after: number;
  channel: string | null;
  note: string | null;
  sku: string | null;
  variant_title: string | null;
  product_name: string | null;
  user_name: string | null;
  total_count: number;
};

const iso = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const field = 'h-11 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm outline-none transition-colors focus:border-[#0094eb] focus:ring-2 focus:ring-[#0094eb]/15';

export default function StockHistoryPanel() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [from, setFrom] = useState(() => iso(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState(() => iso(new Date()));
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    try {
      const start = new Date(`${from}T00:00:00`);
      const end = new Date(`${to}T00:00:00`);
      end.setDate(end.getDate() + 1);
      const { data, error } = await sb.rpc('gestor_stock_ledger', {
        p_store: storeId,
        p_from: start.toISOString(),
        p_to: end.toISOString(),
        p_search: query.trim() || null,
        p_type: type || null,
        p_limit: PAGE,
        p_offset: page * PAGE,
      });
      if (error) throw new Error(error.message);
      const list = (data || []) as Row[];
      setRows(list);
      setTotal(list.length ? Number(list[0].total_count) : 0);
    } catch (e) {
      console.error('[Gestor] historico', e);
      showError((e as Error).message || 'Erro ao carregar o histórico.');
    } finally {
      setLoading(false);
    }
  }, [storeId, from, to, query, type, page]);

  useEffect(() => { if (!lojaLoading) void load(); }, [lojaLoading, load]);

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const fmt = (v: string) =>
    new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative min-w-[16rem] flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por produto, variação ou SKU..."
            className={cn(field, 'w-full pl-10')}
          />
        </div>
        <select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} className={cn(field, 'cursor-pointer')}>
          <option value="">Todos os tipos</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          De
          <input type="date" value={from} max={to} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={cn(field, 'mt-1 block')} />
        </label>
        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Até
          <input type="date" value={to} min={from} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={cn(field, 'mt-1 block')} />
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[#0094eb]" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 p-10 text-center text-sm text-slate-500">Nenhuma movimentação no período.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full table-fixed text-left text-xs">
            <colgroup>
              <col className="w-[13%]" />
              <col />
              <col className="w-[11%]" />
              <col className="w-[8%]" />
              <col className="w-[8%]" />
              <col className="w-[12%]" />
              <col className="w-[14%]" />
            </colgroup>
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Produto</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2 text-right">Qtd</th>
                <th className="px-3 py-2 text-right">Saldo</th>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Usuário</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id} className="align-top transition-colors hover:bg-slate-50/70">
                  <td className="px-3 py-2 text-slate-500">{fmt(r.created_at)}</td>
                  <td className="break-words px-3 py-2">
                    <p className="font-semibold text-slate-800">{r.product_name || '-'}</p>
                    <p className="text-[11px] text-slate-400">
                      {[r.variant_title && r.variant_title !== r.product_name ? r.variant_title : null, r.sku].filter(Boolean).join(' · ')}
                    </p>
                    {r.note && <p className="mt-0.5 text-[11px] italic text-slate-500">{r.note}</p>}
                  </td>
                  <td className="px-3 py-2">{TYPE_LABEL[r.type] || r.type}</td>
                  <td className={cn('px-3 py-2 text-right font-mono font-bold', r.qty > 0 ? 'text-emerald-600' : r.qty < 0 ? 'text-rose-600' : 'text-slate-400')}>
                    {r.qty > 0 ? `+${r.qty}` : r.qty}
                  </td>
                  <td className="px-3 py-2 text-right font-mono">{r.balance_after}</td>
                  <td className="break-words px-3 py-2 text-slate-500">{CHANNEL_LABEL[r.channel || ''] || r.channel || '-'}</td>
                  <td className="break-words px-3 py-2 text-slate-500">{r.user_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 text-xs text-slate-500">
        <span>{total} movimentação(ões) · Página {page + 1} de {pages}</span>
        <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Anterior" className="cursor-pointer rounded-xl border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
        <button type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima" className="cursor-pointer rounded-xl border border-slate-200 p-2 hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}