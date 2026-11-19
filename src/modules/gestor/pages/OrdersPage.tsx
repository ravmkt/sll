import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import OrderDetailDialog from '../components/OrderDetailDialog';
import {
  FULFILLMENT_LABEL,
  PAGE_SIZE,
  PAYMENT_LABEL,
  Row,
  brl,
  customerName,
  fmtDate,
  fulfillmentOf,
  listOrders,
  orderFacets,
  pick,
} from '../services/pedidos';

const selectCls = 'h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900';

export default function OrdersPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [payment, setPayment] = useState('');
  const [fulfillment, setFulfillment] = useState('');
  const [channel, setChannel] = useState('');
  const [page, setPage] = useState(0);
  const [facets, setFacets] = useState<{ payment: string[]; channel: string[] }>({ payment: [], channel: [] });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!storeId) return;
    orderFacets(storeId).then(setFacets).catch(() => undefined);
  }, [storeId]);

  const reload = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await listOrders(storeId, { search: query, payment, fulfillment, channel, page });
      setRows(r.rows);
      setTotal(r.total);
    } catch (e) {
      console.error('[Gestor]', e);
      showError('Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  }, [storeId, query, payment, fulfillment, channel, page]);

  useEffect(() => { if (!lojaLoading) reload(); }, [lojaLoading, reload]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const onFilter = (fn: (v: string) => void) => (e: React.ChangeEvent<HTMLSelectElement>) => { fn(e.target.value); setPage(0); };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <p className="text-sm text-muted-foreground">Todos os canais em uma lista. {total} pedido(s).</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Número, cliente, e-mail ou SKU" className="pl-9" />
        </div>
        <select className={selectCls} value={fulfillment} onChange={onFilter(setFulfillment)}>
          <option value="">Todas as situações</option>
          {Object.entries(FULFILLMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={selectCls} value={payment} onChange={onFilter(setPayment)}>
          <option value="">Todos os pagamentos</option>
          {facets.payment.map((p) => <option key={p} value={p}>{PAYMENT_LABEL[p] || p}</option>)}
        </select>
        <select className={selectCls} value={channel} onChange={onFilter(setChannel)}>
          <option value="">Todos os canais</option>
          {facets.channel.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-muted-foreground">Nenhum pedido encontrado.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="p-3 font-medium">Pedido</th>
                <th className="p-3 font-medium">Data</th>
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium">Canal</th>
                <th className="p-3 font-medium">Pagamento</th>
                <th className="p-3 font-medium">Situação</th>
                <th className="p-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const st = fulfillmentOf(r);
                return (
                  <tr key={r.id} className="cursor-pointer border-b last:border-0 hover:bg-slate-50" onClick={() => setSelected(r.id)}>
                    <td className="p-3 font-medium">#{pick(r, 'number', 'external_id')}</td>
                    <td className="p-3 text-muted-foreground">{fmtDate(pick(r, 'created_at', 'ordered_at'))}</td>
                    <td className="p-3">{customerName(r, r.customer)}</td>
                    <td className="p-3 text-muted-foreground">{r.channel || '-'}</td>
                    <td className="p-3">{PAYMENT_LABEL[r.payment_status] || r.payment_status || '-'}</td>
                    <td className="p-3"><Badge variant={st === 'canceled' ? 'destructive' : st === 'delivered' ? 'secondary' : 'outline'}>{FULFILLMENT_LABEL[st] || st}</Badge></td>
                    <td className="p-3 text-right font-semibold">{brl(r.total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">Página {page + 1} de {pages}</span>
        <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima"><ChevronRight className="h-4 w-4" /></Button>
      </div>

      {storeId && (
        <OrderDetailDialog storeId={storeId} orderId={selected} onClose={() => setSelected(null)} onChanged={reload} />
      )}
    </div>
  );
}