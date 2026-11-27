import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { SllField, SllFilterBar, SllSearch, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllPeriodFilter, PERIOD_ALL, periodRange } from '@/components/sll/SllPeriodFilter';
import type { PeriodValue } from '@/components/sll/SllPeriodFilter';
import { SllPager, SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { ConfirmDangerModal } from '@/components/common/AppModal';
import { showError, showSuccess } from '@/utils/toast';
import OrderDetailDialog from '../components/OrderDetailDialog';
import OrderStatusBadge from '../components/OrderStatusBadge';
import OrderStatusDialog from '../components/OrderStatusDialog';
import { NotaDetailModal, NotaRegisterModal, StatusBadge } from '../components/NotasModals';
import type { NfOrderPrefill } from '../components/NotasModals';
import { NF_STATUS_LABEL, activeNotasByOrder, fmtNumber } from '../services/notas';
import type { NfNota } from '../services/notas';
import ChannelFavicon, { normChannel } from '../components/ChannelFavicon';
import { useGestorAccess } from '../hooks/useGestorAccess';
import {
  FULFILLMENT_LABEL, PAGE_SIZE, PAYMENT_LABEL, brl, customerName, fmtDate, fulfillmentOf, listOrders, orderFacets, pick,
} from '../services/pedidos';
import type { Row } from '../services/pedidos';
import { buildOrdersHtml, deleteOrders, fetchDetails } from '../services/pedidosBulk';
import type { PrintMode } from '../services/pedidosBulk';

const act =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[color:var(--sll-b-brand-soft)] hover:text-[color:var(--sll-b-brand)]';
const checkCls = 'h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]';
const actDone =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-emerald-600 transition-colors hover:bg-emerald-50 dark:hover:bg-emerald-500/10';

const PAY_CLS: Record<string, string> = {
  paid: 'bg-emerald-600 text-white',
  approved: 'bg-emerald-600 text-white',
  pending: 'bg-amber-600 text-white',
  waiting_payment: 'bg-amber-600 text-white',
  refused: 'bg-red-600 text-white',
  refunded: 'bg-slate-500 text-white',
  canceled: 'bg-slate-500 text-white',
  cancelled: 'bg-slate-500 text-white',
};

function PayBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-slate-300">-</span>;
  return (
    <span className={'inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold ' + (PAY_CLS[status] ?? 'bg-slate-500 text-white')}>
      {PAYMENT_LABEL[status] || status}
    </span>
  );
}

function ChannelCell({ value }: { value: string | null }) {
  const x = String(value || '').toLowerCase();
  const key = normChannel(x) ?? (x.startsWith('yampi') ? 'yampi' : null);
  if (key) return <span className="inline-flex"><ChannelFavicon channel={key} size={20} /></span>;
  return <span className="text-slate-400">{value || '-'}</span>;
}

export default function OrdersPage() {
  const { can: allow } = useGestorAccess();
  const { storeId, loading: lojaLoading } = useLoja();
  const canEdit = allow('pedidos', 'editar');
  const canSeeNf = allow('notas_fiscais', 'ver');
  const canCreateNf = allow('notas_fiscais', 'criar');

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [fulfillment, setFulfillment] = useState('');
  const [channel, setChannel] = useState('');
  const [period, setPeriod] = useState<PeriodValue>(PERIOD_ALL);
  const [page, setPage] = useState(0);
  const [channels, setChannels] = useState<string[]>([]);
  const [detail, setDetail] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusIds, setStatusIds] = useState<string[] | null>(null);
  const [nfQueue, setNfQueue] = useState<{ items: NfOrderPrefill[]; index: number; skipped: number } | null>(null);
  const [nfBusy, setNfBusy] = useState(false);
  const [nfNotes, setNfNotes] = useState<Map<string, NfNota>>(new Map());
  const [nfDetail, setNfDetail] = useState<string | null>(null);
  const [nfTick, setNfTick] = useState(0);
  const [printing, setPrinting] = useState(false);
  const [printIds, setPrintIds] = useState<string[] | null>(null);
  const [printMode, setPrintMode] = useState<PrintMode>('page');
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const range = useMemo(() => periodRange(period), [period]);

  useEffect(() => {
    const t = setTimeout(() => { setQuery(search); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!storeId) return;
    orderFacets(storeId).then((f) => setChannels(f.channel)).catch(() => undefined);
  }, [storeId]);

  useEffect(() => { setSelected(new Set()); }, [query, fulfillment, channel, range.from, range.to]);

  const reload = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    try {
      const r = await listOrders(storeId, { search: query, payment: '', fulfillment, channel, page, from: range.from, to: range.to });
      setRows(r.rows);
      setTotal(r.total);
    } catch (e) {
      console.error('[Gestor]', e);
      showError('Erro ao carregar pedidos.');
    } finally {
      setLoading(false);
    }
  }, [storeId, query, fulfillment, channel, page, range.from, range.to]);

  useEffect(() => { if (!lojaLoading) void reload(); }, [lojaLoading, reload]);

  useEffect(() => {
    if (!storeId || !canSeeNf || rows.length === 0) { setNfNotes(new Map()); return; }
    let alive = true;
    activeNotasByOrder(storeId, rows.map((r) => r.id as string))
      .then((m) => { if (alive) setNfNotes(m); })
      .catch(() => { if (alive) setNfNotes(new Map()); });
    return () => { alive = false; };
  }, [storeId, rows, canSeeNf, nfTick]);

  const startNf = async (ids: string[]) => {
    if (!storeId || nfBusy) return;
    setNfBusy(true);
    try {
      const [details, existing] = await Promise.all([fetchDetails(ids), activeNotasByOrder(storeId, ids)]);
      const items: NfOrderPrefill[] = details
        .filter((d) => !d.order.canceled_at && !existing.has(d.order.id))
        .map((d) => ({
          id: d.order.id as string,
          label: `#${pick(d.order, 'number', 'external_id') ?? ''}`,
          name: customerName(d.order, d.customer),
          document: String(pick(d.customer, 'document', 'cpf', 'cnpj') ?? ''),
          total: Number(d.order.total || 0),
          channel: String(d.order.channel || ''),
        }));
      const skipped = ids.length - items.length;
      if (items.length === 0) { showError('Nenhum pedido elegível: todos estão cancelados ou já têm nota fiscal.'); return; }
      setNfQueue({ items, index: 0, skipped });
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setNfBusy(false);
    }
  };

  const nextNf = () =>
    setNfQueue((q) => (q && q.index + 1 < q.items.length ? { ...q, index: q.index + 1 } : null));

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const pageIds = rows.map((r) => r.id as string);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const someOnPage = pageIds.some((id) => selected.has(id));
  const toggleRow = (id: string) =>
    setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const togglePage = () =>
    setSelected((p) => {
      const n = new Set(p);
      if (allOnPage) pageIds.forEach((id) => n.delete(id)); else pageIds.forEach((id) => n.add(id));
      return n;
    });

  const needSelection = () => {
    if (selected.size === 0) { showError('Marque ao menos um pedido na lista.'); return true; }
    return false;
  };

  const printOrders = async (ids: string[], mode: PrintMode = 'page') => {
    const w = window.open('', '_blank');
    if (!w) { showError('Libere os pop-ups para imprimir.'); return; }
    w.document.write('<p style="font-family:Arial;padding:24px">Preparando impressão...</p>');
    setPrinting(true);
    try {
      const list = await fetchDetails(ids);
      if (list.length === 0) throw new Error('Não foi possível carregar os pedidos para impressão.');
      w.document.open();
      w.document.write(buildOrdersHtml(list, mode));
      w.document.close();
      w.focus();
      w.print();
    } catch (e) {
      w.close();
      showError((e as Error).message);
    } finally {
      setPrinting(false);
    }
  };

  const requestPrint = (ids: string[]) => {
    if (ids.length > 1) { setPrintMode('page'); setPrintIds(ids); } else void printOrders(ids);
  };

  const confirmDelete = async () => {
    if (!deleteIds?.length) return;
    setDeleting(true);
    try {
      const n = await deleteOrders(deleteIds);
      showSuccess(`${n} pedido(s) excluído(s).`);
      setSelected((p) => { const s = new Set(p); deleteIds.forEach((id) => s.delete(id)); return s; });
      const wasLastPage = rows.length <= deleteIds.length && page > 0;
      setDeleteIds(null);
      if (wasLastPage) setPage((p) => p - 1); else await reload();
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  const slot = 'flex h-8 w-8 items-center justify-center';
  const H = (t: string) => <div className="w-full text-center">{t}</div>;

  const columns: SllColumn<Row>[] = [
    {
      key: 'sel', align: 'center', className: 'w-10',
      header: (
        <label className="flex cursor-pointer items-center justify-center p-1" title="Selecionar todos desta página">
          <input type="checkbox" className={checkCls} checked={allOnPage} ref={(el) => { if (el) el.indeterminate = someOnPage && !allOnPage; }} onChange={togglePage} />
        </label>
      ),
      render: (r) => (
        <label className="flex cursor-pointer items-center justify-center p-1" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" className={checkCls} checked={selected.has(r.id)} onChange={() => toggleRow(r.id)} />
        </label>
      ),
    },
    { key: 'num', header: H('Pedido'), align: 'center', render: (r) => <span className="font-bold text-slate-800 dark:text-white">#{pick(r, 'number', 'external_id')}</span> },
    { key: 'data', header: H('Data'), align: 'center', render: (r) => <span className="text-slate-500">{fmtDate(pick(r, 'created_at', 'ordered_at'))}</span> },
    { key: 'cli', header: H('Cliente'), align: 'left', render: (r) => <span className="text-sm font-semibold text-slate-800 dark:text-white">{customerName(r, r.customer)}</span> },
    { key: 'canal', header: H('Canal'), align: 'center', className: 'w-20', render: (r) => <ChannelCell value={r.channel} /> },
    { key: 'status', header: H('Status'), align: 'center', render: (r) => <OrderStatusBadge status={fulfillmentOf(r)} /> },
        { key: 'pagto', header: H('Pagamento'), align: 'center', render: (r) => <PayBadge status={r.payment_status ?? null} /> },
    { key: 'total', header: H('Total'), align: 'center', render: (r) => <span className="font-mono font-bold">{brl(r.total)}</span> },
    {
      key: 'nf', header: H('NF'), align: 'center', className: 'w-28',
      render: (r) => { const nf = nfNotes.get(r.id); return nf ? <StatusBadge s={nf.status} /> : <span className="text-slate-300">-</span>; },
    },
    {
      key: 'acoes', header: H('Ações'), align: 'center', className: 'w-44',
      render: (r) => (
        <div className="grid grid-cols-[repeat(4,2rem)] justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <span className={slot}>
            <button type="button" title="Imprimir pedido" aria-label="Imprimir pedido" onClick={() => void printOrders([r.id])} className={act}><Printer size={16} /></button>
          </span>
          <span className={slot}>
            {nfNotes.get(r.id) ? (
                  canSeeNf && (
                    <button
                      type="button"
                      title={`Nota fiscal ${fmtNumber(nfNotes.get(r.id)!)} (${NF_STATUS_LABEL[nfNotes.get(r.id)!.status]})`}
                      aria-label="Ver nota fiscal"
                      onClick={() => setNfDetail(nfNotes.get(r.id)!.id)}
                      className={actDone}
                    ><FileText size={16} /></button>
                  )
                ) : (
                  canCreateNf && !r.canceled_at && (
                    <button type="button" title="Registrar nota fiscal" aria-label="Registrar nota fiscal" onClick={() => void startNf([r.id])} className={act}><FileText size={16} /></button>
                  )
                )}
          </span>
          <span className={slot}>
            {canEdit && !r.canceled_at && (
              <button type="button" title="Alterar status" aria-label="Alterar status" onClick={() => setStatusIds([r.id])} className={act}><RefreshCw size={16} /></button>
            )}
          </span>
          <span className={slot}>
            {canEdit && (
              <button
                type="button"
                title="Excluir pedido"
                aria-label="Excluir pedido"
                onClick={() => setDeleteIds([r.id])}
                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-400"
              >
                <Trash2 size={16} />
              </button>
            )}
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pedidos</h1>
          <p className="text-sm text-slate-500">Todos os canais em uma lista.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={printing} onClick={() => { if (!needSelection()) requestPrint([...selected]); }} className={sllBtnGhost}>
            {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Imprimir selecionados
          </button>
          {canCreateNf && (
            <button type="button" disabled={nfBusy} onClick={() => { if (!needSelection()) void startNf([...selected]); }} className={sllBtnGhost}>
              {nfBusy ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Registrar nota fiscal
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={() => { if (!needSelection()) setStatusIds([...selected]); }} className={sllBtnPrimary}>
              <RefreshCw size={16} /> Alterar status
            </button>
          )}
        </div>
      </div>

      <SllFilterBar>
        <SllSearch value={search} onChange={setSearch} placeholder="Número, cliente, e-mail ou SKU" />
        <SllPeriodFilter value={period} onChange={(v) => { setPeriod(v); setPage(0); }} />
        <SllField label="Status" className="w-48">
          <select value={fulfillment} onChange={(e) => { setFulfillment(e.target.value); setPage(0); }} className={sllFieldCls + ' cursor-pointer'}>
            <option value="">Todos os status</option>
            {Object.entries(FULFILLMENT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </SllField>
        <SllField label="Canal" className="w-44">
          <select value={channel} onChange={(e) => { setChannel(e.target.value); setPage(0); }} className={sllFieldCls + ' cursor-pointer'}>
            <option value="">Todos os canais</option>
            {channels.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </SllField>
      </SllFilterBar>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color:var(--sll-b-brand-border)] bg-[color:var(--sll-b-brand-soft)] px-4 py-2 text-sm">
          <span><b>{selected.size}</b> pedido(s) selecionado(s)</span>
          <button type="button" onClick={() => setSelected(new Set())} className="cursor-pointer font-semibold text-[color:var(--sll-b-brand)] hover:underline">Limpar seleção</button>
        </div>
      )}

      <SllTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={(r) => setDetail(r.id)}
        loading={loading}
        empty="Nenhum pedido encontrado."
        minWidth="64rem"
      />

      <SllPager page={page} pages={pages} total={total} noun="pedido(s)" onPage={setPage} />

      {storeId && <OrderDetailDialog storeId={storeId} orderId={detail} onClose={() => setDetail(null)} onChanged={() => void reload()} />}

      <OrderStatusDialog ids={statusIds} onClose={() => setStatusIds(null)} onDone={() => { setSelected(new Set()); void reload(); }} />

      <ConfirmDangerModal
        open={!!deleteIds}
        title={deleteIds && deleteIds.length > 1 ? 'EXCLUIR PEDIDOS' : 'EXCLUIR PEDIDO'}
        itemName={
          deleteIds && deleteIds.length === 1
            ? `Pedido #${pick(rows.find((r) => r.id === deleteIds[0]) ?? {}, 'number', 'external_id') ?? ''}`
            : `${deleteIds?.length ?? 0} pedidos`
        }
        message={'Esta ação é irreversível. ' + (deleteIds && deleteIds.length > 1 ? 'Os pedidos e seus itens serão removidos permanentemente.' : 'O pedido e seus itens serão removidos permanentemente.') + ' O estoque não é devolvido: se o pedido já baixou estoque, cancele-o antes de excluir.'}
        busy={deleting}
        onClose={() => { if (!deleting) setDeleteIds(null); }}
        onConfirm={() => void confirmDelete()}
      />

      <SllModal
        open={!!printIds}
        onOpenChange={(o) => { if (!o) setPrintIds(null); }}
        title="Imprimir pedidos"
        size="md"
        footer={(
          <>
            <button type="button" onClick={() => setPrintIds(null)} className={sllBtnGhost}>Cancelar</button>
            <button
              type="button"
              onClick={() => { const ids = printIds ?? []; setPrintIds(null); void printOrders(ids, printMode); }}
              className={sllBtnPrimary}
            >
              <Printer size={16} /> Imprimir
            </button>
          </>
        )}
      >
        <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">
          Como imprimir os <strong>{printIds?.length ?? 0}</strong> pedidos selecionados?
        </p>
        <div className="space-y-2">
          {([
            { key: 'page', label: 'Uma por folha', hint: 'Cada pedido começa em uma folha nova.' },
            { key: 'flow', label: 'Corrido', hint: 'Os pedidos seguem um após o outro, aproveitando a folha.' },
          ] as { key: PrintMode; label: string; hint: string }[]).map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setPrintMode(o.key)}
              className={`flex w-full cursor-pointer items-center justify-between rounded-xl border bg-white px-4 py-3 text-left transition dark:bg-slate-800 ${
                printMode === o.key
                  ? 'border-[color:var(--sll-b-brand)] ring-2 ring-[color:var(--sll-b-brand-soft)]'
                  : 'border-slate-200 hover:border-[color:var(--sll-b-brand)] dark:border-slate-700'
              }`}
            >
              <span>
                <span className="block text-sm font-bold text-slate-800 dark:text-white">{o.label}</span>
                <span className="block text-xs text-slate-500">{o.hint}</span>
              </span>
              {printMode === o.key && <span className="text-xs font-bold text-[color:var(--sll-b-brand)]">Selecionado</span>}
            </button>
          ))}
        </div>
      </SllModal>

      {nfQueue && storeId && (
        <NotaRegisterModal
          key={nfQueue.items[nfQueue.index].id}
          storeId={storeId}
          order={nfQueue.items[nfQueue.index]}
          step={`Pedido ${nfQueue.index + 1} de ${nfQueue.items.length}${nfQueue.skipped ? ` · ${nfQueue.skipped} ignorado(s) (cancelado ou já com nota)` : ''}`}
          onSaved={() => setNfTick((n) => n + 1)}
          onNext={nextNf}
          onSkip={nfQueue.index < nfQueue.items.length - 1 ? nextNf : undefined}
          onClose={() => setNfQueue(null)}
        />
      )}

      {nfDetail && (
        <NotaDetailModal
          notaId={nfDetail}
          canEdit={allow('notas_fiscais', 'editar')}
          onClose={() => setNfDetail(null)}
          onChanged={() => setNfTick((n) => n + 1)}
        />
      )}
    </div>
  );
}