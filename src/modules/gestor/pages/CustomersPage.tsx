import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, Plus, Tags, Upload } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { SllField, SllFilterBar, SllSearch, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllPager, SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { showError, showSuccess } from '@/utils/toast';
import { exportCustomers } from '../services/clientes-export';
import { applyTagsByPurchase, listCustomerTags, setCustomerTags } from '../services/clientes-tags';
import type { CustomerTag } from '../services/clientes-tags';
import CustomerDialog from '../components/CustomerDialog';
import CustomerActions from '../components/CustomerActions';
import CategoryTagPicker from '../components/CategoryTagPicker';
import ImportCustomersModal from '../components/ImportCustomersModal';
import { PAGE_SIZE, brl, fmtDate, listCustomers, maskDoc } from '../services/clientes';
import type { CustomerRow, SortKey } from '../services/clientes';
import { useGestorAccess } from '../hooks/useGestorAccess';
import { defaultDir } from '../services/clientes';
import type { SortDir } from '../services/clientes';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'total_spent', label: 'Total gasto' },
  { value: 'last_order_at', label: 'Última compra' },
  { value: 'created_at', label: 'Cadastro' },
  { value: 'name', label: 'Nome' },
  { value: 'orders_count', label: 'Pedidos' },
  { value: 'avg_ticket', label: 'Ticket médio' },
  { value: 'city', label: 'Cidade' },
  { value: 'document', label: 'Documento' },
  { value: 'tags', label: 'Tags' },
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
  const [tagList, setTagList] = useState<CustomerTag[]>([]);
  const [sort, setSort] = useState<SortKey>('total_spent');
  const [dir, setDir] = useState<SortDir>('desc');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [applying, setApplying] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const canEdit = allow('clientes', 'editar');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const pageIds = rows.map((r) => r.customer_id);
  const selOnPage = pageIds.filter((id) => selected.has(id)).length;
  const allOnPage = pageIds.length > 0 && selOnPage === pageIds.length;
  const toggleOne = (id: string) => setSelected((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleAll = () => setSelected((p) => {
    const n = new Set(p);
    if (allOnPage) pageIds.forEach((id) => n.delete(id)); else pageIds.forEach((id) => n.add(id));
    return n;
  });

  const doExport = async () => {
    if (!storeId) return;
    setExporting(true); setErr('');
    try { await exportCustomers({ storeId, search: debounced, tag, sort, dir }); }
    catch (e: any) { setErr(e?.message ?? 'Erro ao exportar'); }
    finally { setExporting(false); }
  };

  useEffect(() => {
    const t = setTimeout(() => { setDebounced(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const loadTags = useCallback(async () => {
    if (!storeId) return;
    try { setTagList(await listCustomerTags(storeId)); }
    catch (e) { console.error('[Gestor] tags', e); }
  }, [storeId]);

  useEffect(() => { void loadTags(); }, [loadTags]);

  const load = useCallback(async () => {
    if (!storeId) return;
    setLoading(true); setErr('');
    try {
      const r = await listCustomers({ storeId, search: debounced, tag, sort, dir, page });
      setRows(r.rows); setTotal(r.total);
    } catch (e: any) { setErr(e?.message ?? 'Erro ao carregar clientes'); }
    finally { setLoading(false); }
  }, [storeId, debounced, tag, sort, dir, page]);

  useEffect(() => { void load(); }, [load]);

  const onSort = (key: string) => {
    const k = key as SortKey;
    if (k === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(k); setDir(defaultDir(k)); }
    setPage(0);
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const open = (id: string | null) => { setOpenId(id); setDialogOpen(true); };
  const allTags = useMemo(() => tagList.map((t) => t.tag), [tagList]);

  const changeTags = async (r: CustomerRow, list: string[]) => {
    const prev = r.tags ?? [];
    setRows((p) => p.map((x) => (x.customer_id === r.customer_id ? { ...x, tags: list } : x)));
    try {
      await setCustomerTags(r.customer_id, list);
      void loadTags();
    } catch (e) {
      setRows((p) => p.map((x) => (x.customer_id === r.customer_id ? { ...x, tags: prev } : x)));
      showError((e as Error).message);
    }
  };

  const applyByPurchase = async () => {
    if (!storeId) return;
    setApplying(true);
    try {
      const n = await applyTagsByPurchase(storeId);
      showSuccess(n ? `${n} cliente(s) receberam tags pelo que compraram.` : 'Nenhum cliente com tag nova para aplicar.');
      await Promise.all([load(), loadTags()]);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setApplying(false);
    }
  };

  const columns: SllColumn<CustomerRow>[] = [
    {
      key: 'sel', className: 'w-10',
      header: (
        <input
          type="checkbox"
          aria-label="Selecionar todos da página"
          checked={allOnPage}
          ref={(el) => { if (el) el.indeterminate = selOnPage > 0 && !allOnPage; }}
          onChange={toggleAll}
          className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]"
        />
      ),
      render: (r) => (
        <span onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            aria-label={'Selecionar ' + r.name}
            checked={selected.has(r.customer_id)}
            onChange={() => toggleOne(r.customer_id)}
            className="h-4 w-4 cursor-pointer accent-[color:var(--sll-b-brand)]"
          />
        </span>
      ),
    },
    {
      key: 'cliente', sortKey: 'name', header: 'Cliente',
      render: (r) => (
        <>
          <p className="text-sm font-bold text-slate-800 dark:text-white">{r.name}</p>
          <p className="text-[11px] text-slate-400">{r.email ?? r.phone ?? '-'}</p>
        </>
      ),
    },
    {
      key: 'tags', sortKey: 'tags', header: 'Tags', className: 'min-w-[11rem]',
      render: (r) => (
        <div className="flex items-start gap-1" onClick={(e) => e.stopPropagation()}>
          {canEdit ? (
            <CategoryTagPicker value={r.tags ?? []} allTags={allTags} onChange={(list) => void changeTags(r, list)} />
          ) : (r.tags ?? []).length === 0 ? (
            <span className="text-slate-300">-</span>
          ) : (
            <div className="flex flex-wrap gap-1">
              {r.tags.map((t) => (
                <button key={t} type="button" onClick={() => { setTag(t); setPage(0); }} className="cursor-pointer rounded-full bg-[color:var(--sll-b-brand-soft)] px-2 py-0.5 text-[10px] font-bold text-[color:var(--sll-b-brand)]">{t}</button>
              ))}
            </div>
          )}
        </div>
      ),
    },
    { key: 'doc', sortKey: 'document', header: 'Documento', render: (r) => <span className="font-mono text-slate-500">{maskDoc(r.document)}</span> },
    { key: 'cidade', sortKey: 'city', header: 'Cidade/UF', render: (r) => <span className="text-slate-500">{[r.city, r.state].filter(Boolean).join('/') || '-'}</span> },
    { key: 'pedidos', sortKey: 'orders_count', header: 'Pedidos', align: 'right', render: (r) => <span className="font-mono font-bold">{r.orders_count}</span> },
    { key: 'total', sortKey: 'total_spent', header: 'Total gasto', align: 'right', render: (r) => <span className="font-mono font-bold">{brl(r.total_spent)}</span> },
    { key: 'ticket', sortKey: 'avg_ticket', header: 'Ticket médio', align: 'right', render: (r) => <span className="font-mono text-slate-600 dark:text-slate-300">{brl(r.avg_ticket)}</span> },
    {
      key: 'ultima', sortKey: 'last_order_at', header: 'Última compra',
      render: (r) => (
        <span className="text-slate-500">
          {fmtDate(r.last_order_at)}
          {r.days_since_last != null && <span className="ml-1 text-[11px] text-slate-400">({r.days_since_last}d)</span>}
        </span>
      ),
    },
    {
      key: 'acoes', header: 'Ações', align: 'center', className: 'w-32',
      render: (r) => <CustomerActions row={r} canEdit={canEdit} onEdit={() => open(r.customer_id)} />,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-sm text-slate-500">O total gasto considera só pedidos pagos e não cancelados.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button type="button" disabled={applying} onClick={() => void applyByPurchase()} title="Aplica as tags das categorias dos produtos que cada cliente comprou" className={sllBtnGhost}>
              {applying ? <Loader2 size={16} className="animate-spin" /> : <Tags size={16} />} Tags por compra
            </button>
          )}
          {canEdit && (
            <button type="button" onClick={() => setImportOpen(true)} className={sllBtnGhost}><Upload size={16} /> Importar</button>
          )}
          {canEdit && (
            <button type="button" disabled={exporting} onClick={() => void doExport()} className={sllBtnGhost}>
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} {exporting ? 'Exportando...' : 'Exportar'}
            </button>
          )}
          {allow('clientes', 'criar') && (
            <button type="button" onClick={() => open(null)} className={sllBtnPrimary}><Plus size={16} /> Novo cliente</button>
          )}
        </div>
      </div>

      <SllFilterBar>
        <SllSearch value={search} onChange={setSearch} placeholder="Nome, e-mail, telefone ou documento..." />
        <SllField label="Tag" className="w-56">
          <select value={tag} onChange={(e) => { setTag(e.target.value); setPage(0); }} className={sllFieldCls + ' cursor-pointer'}>
            <option value="">Todas as tags</option>
            {tag && !allTags.includes(tag) && <option value={tag}>{tag}</option>}
            {tagList.map((t) => <option key={t.tag} value={t.tag}>{t.tag} ({t.customers})</option>)}
          </select>
        </SllField>
        <SllField label="Ordenar por" className="w-56">
          <select value={sort} onChange={(e) => { const k = e.target.value as SortKey; setSort(k); setDir(defaultDir(k)); setPage(0); }} className={sllFieldCls + ' cursor-pointer'}>
            {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </SllField>
      </SllFilterBar>

      {selected.size > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-[color:var(--sll-b-brand-border)] bg-[color:var(--sll-b-brand-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--sll-b-brand)]">
              <span>{selected.size} cliente(s) selecionado(s)</span>
              <button type="button" onClick={() => setSelected(new Set())} className="cursor-pointer underline">Limpar seleção</button>
            </div>
          )}

          {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{err}</p>}

      <SllTable
        columns={columns}
        rows={rows}
        rowKey={(r) => r.customer_id}
        sort={{ key: sort, dir }}
        onSort={onSort}
        onRowClick={(r) => open(r.customer_id)}
        loading={loading}
        empty="Nenhum cliente encontrado."
        minWidth="64rem"
      />

      <SllPager page={page} pages={pages} total={total} noun="cliente(s)" onPage={setPage} />

      {importOpen && storeId && <ImportCustomersModal storeId={storeId} onClose={() => setImportOpen(false)} onDone={() => { void load(); void loadTags(); }} />}

      {storeId && (
        <CustomerDialog storeId={storeId} customerId={openId} open={dialogOpen} onClose={() => setDialogOpen(false)} onSaved={() => { void load(); void loadTags(); }} />
      )}
    </div>
  );
}