import { useCallback, useEffect, useState } from 'react';
import { Download, Loader2, Plus } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { SllField, SllFilterBar, SllSearch, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllPager, SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { exportCustomers } from '../services/clientes-export';
import CustomerDialog from '../components/CustomerDialog';
import YampiHistoryImport from '../components/YampiHistoryImport';
import { PAGE_SIZE, brl, fmtDate, listCustomers, maskDoc } from '../services/clientes';
import type { CustomerRow, SortKey } from '../services/clientes';
import { useGestorAccess } from '../hooks/useGestorAccess';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'total_spent', label: 'Maior total gasto' },
  { value: 'last_order_at', label: 'Última compra' },
  { value: 'created_at', label: 'Cadastro mais recente' },
  { value: 'name', label: 'Nome (A-Z)' },
];

const COLUMNS: SllColumn<CustomerRow>[] = [
  {
    key: 'cliente', header: 'Cliente',
    render: (r) => (
      <>
        <p className="text-sm font-bold text-slate-800 dark:text-white">{r.name}</p>
        <p className="text-[11px] text-slate-400">{r.email ?? r.phone ?? '-'}</p>
        {r.tags?.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {r.tags.map((t) => (
              <span key={t} className="rounded bg-slate-100 px-1.5 text-[10px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">{t}</span>
            ))}
          </div>
        )}
      </>
    ),
  },
  { key: 'doc', header: 'Documento', render: (r) => <span className="font-mono text-slate-500">{maskDoc(r.document)}</span> },
  { key: 'cidade', header: 'Cidade/UF', render: (r) => <span className="text-slate-500">{[r.city, r.state].filter(Boolean).join('/') || '-'}</span> },
  { key: 'pedidos', header: 'Pedidos', align: 'right', render: (r) => <span className="font-mono font-bold">{r.orders_count}</span> },
  { key: 'total', header: 'Total gasto', align: 'right', render: (r) => <span className="font-mono font-bold">{brl(r.total_spent)}</span> },
  { key: 'ticket', header: 'Ticket médio', align: 'right', render: (r) => <span className="font-mono text-slate-600 dark:text-slate-300">{brl(r.avg_ticket)}</span> },
  {
    key: 'ultima', header: 'Última compra',
    render: (r) => (
      <span className="text-slate-500">
        {fmtDate(r.last_order_at)}
        {r.days_since_last != null && <span className="ml-1 text-[11px] text-slate-400">({r.days_since_last}d)</span>}
      </span>
    ),
  },
];

export default function CustomersPage() {
  const { can: allow } = useGestorAccess();
  const ctx: any = useLoja();
  const storeId: string | null = ctx?.loja?.id ?? ctx?.store?.id ?? ctx?.storeId ?? ctx?.lojaId ?? null;

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState<SortKey>('total_spent');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const canExport = allow('clientes', 'editar');

  const doExport = async () => {
    if (!storeId) return;
    setExporting(true); setErr('');
    try { await exportCustomers({ storeId, search: debounced, tag, sort }); }
    catch (e: any) { setErr(e?.message ?? 'Erro ao exportar'); }
    finally { setExporting(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setErr('');
    try {
      const r = await listCustomers({ storeId, search: debounced, tag, sort, page });
      setRows(r.rows); setTotal(r.total);
    } catch (e: any) { setErr(e?.message ?? 'Erro ao carregar clientes'); }
    finally { setLoading(false); }
  }, [storeId, debounced, tag, sort, page]);

  useEffect(() => { void load(); }, [load]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const open = (id: string | null) => { setOpenId(id); setDialogOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-slate-500">O total gasto considera só pedidos pagos e não cancelados.</p>
        </div>
        <div className="flex items-center gap-2">
              {canExport && (
                <button type="button" disabled={exporting} onClick={() => void doExport()} className={sllBtnGhost}>
                  {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {exporting ? 'Exportando...' : 'Exportar'}
                </button>
              )}
              {allow('clientes', 'criar') && (
          <button type="button" onClick={() => open(null)} className={sllBtnPrimary}><Plus size={16} /> Novo cliente</button>
        )}
            </div>
      </div>

      {storeId && allow('clientes', 'editar') && <YampiHistoryImport storeId={storeId} onDone={() => void load()} />}

      <SllFilterBar>
        <SllSearch value={search} onChange={setSearch} placeholder="Nome, e-mail, telefone ou documento..." />
        <SllField label="Tag" className="w-44">
          <input value={tag} onChange={(e) => { setTag(e.target.value); setPage(0); }} placeholder="Filtrar por tag" className={sllFieldCls} />
        </SllField>
        <SllField label="Ordenar por" className="w-56">
          <select value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setPage(0); }} className={sllFieldCls + ' cursor-pointer'}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </SllField>
      </SllFilterBar>

      {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{err}</p>}

      <SllTable
        columns={COLUMNS}
        rows={rows}
        rowKey={(r) => r.customer_id}
        onRowClick={(r) => open(r.customer_id)}
        loading={loading}
        empty="Nenhum cliente encontrado."
        minWidth="56rem"
      />

      <SllPager page={page} pages={pages} total={total} noun="cliente(s)" onPage={setPage} />

      {storeId && (
        <CustomerDialog storeId={storeId} customerId={openId} open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={() => void load()} />
      )}
    </div>
  );
}