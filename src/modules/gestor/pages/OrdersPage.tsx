import { useCallback, useEffect, useMemo, useState } from 'react';
import { FileText, Loader2, Printer, RefreshCw, Trash2 } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { SllField, SllFilterBar, SllSearch, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllPeriodFilter, PERIOD_ALL, periodRange } from '@/components/sll/SllPeriodFilter';
import type { PeriodValue } from '@/components/sll/SllPeriodFilter';
import { SllPager, SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { showError, showSuccess } from '@/utils/toast';
import OrderDetailDialog from '../components/OrderDetailDialog';
import OrderStatusBadge from '../components/OrderStatusBadge';
import OrderStatusDialog from '../components/OrderStatusDialog';
import ChannelFavicon, { normChannel } from '../components/ChannelFavicon';
import { useGestorAccess } from '../hooks/useGestorAccess';
import {
  FULFILLMENT_LABEL, PAGE_SIZE, brl, customerName, fmtDate, fulfillmentOf, listOrders, orderFacets, pick,
} from '../services/pedidos';
import type { Row } from '../services/pedidos';
import { buildOrdersHtml, deleteOrders, fetchDetails } from '../services/pedidosBulk';

const act =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[color:var(--sll-b-brand-soft)] hover:text-[color:var(--sll-b-brand)]';
const checkCls = 'h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]';

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
  const [nfIds, setNfIds] = useState<string[] | null>(null);
  const [printing, setPrinting] = useState(false);
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

  const printOrders = async (ids: string[]) => {
    const w = window.open('', '_blank');
    if (!w) { showError('Libere os pop-ups para imprimir.'); return; }
    w.document.write('<p style="font-family:Arial;padding:24px">Preparando impressão...</p>');
    setPrinting(true);
    try {
      const list = await fetchDetails(ids);
      if (list.length === 0) throw new Error('Não foi possível carregar os pedidos para impressão.');
      w.document.open();
      w.document.write(buildOrdersHtml(list));
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
    { key: 'num', header: 'Pedido', render: (r) => <span className="font-bold text-slate-800 dark:text-white">#{pick(r, 'number', 'external_id')}</span> },
    { key: 'data', header: 'Data', render: (r) => <span className="text-slate-500">{fmtDate(pick(r, 'created_at', 'ordered_at'))}</span> },
    { key: 'cli', header: 'Cliente', render: (r) => <span className="text-sm font-semibold text-slate-800 dark:text-white">{customerName(r, r.customer)}</span> },
    { key: 'canal', header: 'Canal', align: 'center', className: 'w-20', render: (r) => <ChannelCell value={r.channel} /> },
    { key: 'status', header: 'Status', render: (r) => <OrderStatusBadge status={fulfillmentOf(r)} /> },
    { key: 'total', header: 'Total', align: 'right', render: (r) => <span className="font-mono font-bold">{brl(r.total)}</span> },
    {
      key: 'acoes', header: 'Ações', align: 'center', className: 'w-44',
      render: (r) => (
        <div className="grid grid-cols-[repeat(4,2rem)] justify-center gap-1" onClick={(e) => e.stopPropagation()}>
          <span className={slot}>
            <button type="button" title="Imprimir pedido" aria-label="Imprimir pedido" onClick={() => void printOrders([r.id])} className={act}><Printer size={16} /></button>
          </span>
          <span className={slot}>
            {canEdit && (
              <button type="button" title="Gerar nota fiscal" aria-label="Gerar nota fiscal" onClick={() => setNfIds([r.id])} className={act}><FileText size={16} /></button>
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
          <button type="button" disabled={printing} onClick={() => { if (!needSelection()) void printOrders([...selected]); }} className={sllBtnGhost}>
            {printing ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Imprimir selecionados
          </button>
          {canEdit && (
            <button type="button" onClick={() => { if (!needSelection()) setNfIds([...selected]); }} className={sllBtnGhost}>
              <FileText size={16} /> Gerar nota fiscal
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
        minWidth="56rem"
      />

      <SllPager page={page} pages={pages} total={total} noun="pedido(s)" onPage={setPage} />

      {storeId && <OrderDetailDialog storeId={storeId} orderId={detail} onClose={() => setDetail(null)} onChanged={() => void reload()} />}

      <OrderStatusDialog ids={statusIds} onClose={() => setStatusIds(null)} onDone={() => { setSelected(new Set()); void reload(); }} />

      <SllModal
        open={!!deleteIds}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteIds(null); }}
        title="Excluir pedido"
        size="md"
        footer={(
          <>
            <button type="button" disabled={deleting} onClick={() => setDeleteIds(null)} className={sllBtnGhost}>Cancelar</button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => void confirmDelete()}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deleting && <Loader2 size={15} className="animate-spin" />}Excluir
            </button>
          </>
        )}
      >
        <p className="text-sm text-slate-700 dark:text-slate-200">
          Excluir <strong>{deleteIds?.length ?? 0}</strong> pedido(s) e seus itens? Esta ação não pode ser desfeita.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          O estoque não é devolvido na exclusão. Se o pedido já baixou estoque, cancele-o antes.
        </p>
      </SllModal>

      <SllModal
        open={!!nfIds}
        onOpenChange={(o) => { if (!o) setNfIds(null); }}
        title="Gerar nota fiscal"
        size="md"
        footer={<button type="button" onClick={() => setNfIds(null)} className={sllBtnPrimary}>Entendi</button>}
      >
        <p className="text-sm text-slate-700 dark:text-slate-200">
          A emissão de nota fiscal ainda está em desenvolvimento e chega na etapa fiscal do Gestor.
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Quando estiver disponível, os {nfIds?.length ?? 0} pedido(s) escolhido(s) poderão ser emitidos daqui, individualmente ou em lote.
        </p>
      </SllModal>
    </div>
  );
}