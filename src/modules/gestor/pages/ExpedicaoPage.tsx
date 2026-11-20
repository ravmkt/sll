import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Printer, Search, Truck } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import DispatchDialog from '../components/DispatchDialog';
import { brl, fmtDate } from '../services/pedidos';
import {
  EXP_PAGE_SIZE, ExpRow, Stage, advanceOrders, buildPickingHtml, cityUf, isPickup, listExpedicao,
} from '../services/expedicao';
import { useGestorAccess } from '../hooks/useGestorAccess';

const STAGES: { key: Stage; label: string }[] = [
  { key: 'pending', label: 'A separar' },
  { key: 'separating', label: 'Em separação' },
  { key: 'shipped', label: 'Enviados' },
  { key: 'delivered', label: 'Entregues' },
];

export default function ExpedicaoPage() {
  const { can: allow } = useGestorAccess();
  const { storeId, loading: lojaLoading } = useLoja();
  const [stage, setStage] = useState<Stage>('pending');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ExpRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Partial<Record<Stage, number>>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dispatchRow, setDispatchRow] = useState<ExpRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const reload = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await listExpedicao(storeId, stage, query, page);
      setRows(r.rows);
      setTotal(r.total);
      setCounts(r.counts || {});
      setSelected(new Set());
    } catch (e) {
      console.error('[Gestor]', e);
      showError('Erro ao carregar a expedição.');
    } finally {
      setLoading(false);
    }
  }, [storeId, stage, query, page]);

  useEffect(() => { if (!lojaLoading) reload(); }, [lojaLoading, reload]);

  const pages = Math.max(1, Math.ceil(total / EXP_PAGE_SIZE));
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const toggle = (id: string) => setSelected((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });
  const toggleAll = () => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)));

  async function advance(status: 'pending' | 'separating' | 'delivered') {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const n = await advanceOrders([...selected], status);
      showSuccess(`${n} pedido(s) atualizado(s).`);
      await reload();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function print() {
    const list = rows.filter((r) => selected.has(r.id));
    const target = list.length ? list : rows;
    if (target.length === 0) return;
    const w = window.open('', '_blank');
    if (!w) { showError('Libere os pop-ups para imprimir.'); return; }
    w.document.write(buildPickingHtml(target));
    w.document.close();
    w.focus();
    w.print();
  }

  const bulk = stage === 'pending'
    ? { label: 'Iniciar separação', to: 'separating' as const }
    : stage === 'separating'
      ? { label: 'Voltar para a separar', to: 'pending' as const }
      : stage === 'shipped'
        ? { label: 'Marcar como entregue', to: 'delivered' as const }
        : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Expedição</h1>
        <p className="text-sm text-muted-foreground">Pedidos pagos e não cancelados, do mais antigo para o mais novo.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <Button key={s.key} size="sm" variant={stage === s.key ? 'default' : 'outline'}
            onClick={() => { setStage(s.key); setPage(0); }}>
            {s.label} <span className="ml-1.5 rounded-full bg-black/10 px-1.5 text-xs">{counts[s.key] ?? 0}</span>
          </Button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pedido, cliente, SKU ou rastreio" className="pl-9" />
        </div>
        {bulk && (
          <>{allow('expedicao','editar') && (<Button size="sm" variant="outline" disabled={busy || selected.size === 0} onClick={() => advance(bulk.to)}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{bulk.label} ({selected.size})
          </Button>)}</>
        )}
        {(stage === 'pending' || stage === 'separating') && (
          <Button size="sm" variant="outline" disabled={rows.length === 0} onClick={print}>
            <Printer className="mr-1.5 h-4 w-4" /> Lista de separação{selected.size ? ` (${selected.size})` : ''}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border bg-white p-10 text-center text-muted-foreground">Nenhum pedido nesta etapa.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="w-10 p-3"><input type="checkbox" checked={allChecked} onChange={toggleAll} aria-label="Selecionar todos" /></th>
                <th className="p-3 font-medium">Pedido</th>
                <th className="p-3 font-medium">Pago em</th>
                <th className="p-3 font-medium">Cliente</th>
                <th className="p-3 font-medium">Destino</th>
                <th className="p-3 font-medium">Itens</th>
                <th className="p-3 font-medium">Envio</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const qty = r.items.reduce((s, i) => s + Number(i.qty || 0), 0);
                return (
                  <tr key={r.id} className="border-b align-top last:border-0">
                    <td className="p-3"><input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Selecionar pedido ${r.number}`} /></td>
                    <td className="p-3 font-medium">#{r.number}<div className="text-xs font-normal text-muted-foreground">{r.channel || '-'}</div></td>
                    <td className="p-3 text-muted-foreground">{fmtDate(r.paid_at || r.created_at)}</td>
                    <td className="p-3">{r.customer_name || '-'}</td>
                    <td className="p-3">{cityUf(r.address)}</td>
                    <td className="p-3 text-xs">
                      <div className="font-medium">{qty} un.</div>
                      {r.items.slice(0, 3).map((i, idx) => (
                        <div key={idx} className="text-muted-foreground">{i.qty}x {i.sku || i.name}</div>
                      ))}
                      {r.items.length > 3 && <div className="text-muted-foreground">+{r.items.length - 3}</div>}
                    </td>
                    <td className="p-3 text-xs">
                      {isPickup(r.shipping_service) && <Badge variant="outline">Retirada</Badge>}
                      <div>{r.shipping_provider || r.shipping_service || '-'}</div>
                      {r.tracking_code && (
                        r.tracking_url
                          ? <a href={r.tracking_url} target="_blank" rel="noreferrer" className="text-[#0094eb] underline">{r.tracking_code}</a>
                          : <span className="text-muted-foreground">{r.tracking_code}</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-semibold">{brl(r.total)}</td>
                    <td className="p-3 text-right">
                      {stage !== 'delivered' && (
                        <>{allow('expedicao','editar') && (<Button size="sm" variant={stage === 'shipped' ? 'ghost' : 'default'} onClick={() => setDispatchRow(r)}>
                          <Truck className="mr-1.5 h-4 w-4" />{stage === 'shipped' ? 'Editar envio' : 'Enviar'}
                        </Button>)}</>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <span className="text-xs text-muted-foreground">{total} pedido(s) · Página {page + 1} de {pages}</span>
        <Button size="icon" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Anterior"><ChevronLeft className="h-4 w-4" /></Button>
        <Button size="icon" variant="outline" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Próxima"><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <DispatchDialog row={dispatchRow} onClose={() => setDispatchRow(null)} onDone={reload} />
    </div>
  );
}