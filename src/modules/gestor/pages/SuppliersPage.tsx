import { useCallback, useEffect, useMemo, useState } from 'react';
import { Mail, MessageCircle, Pencil, Plus } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { SllField, SllFilterBar, SllSearch, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllPager, SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { sllBtnPrimary } from '@/components/sll/SllModal';
import { showError } from '@/utils/toast';
import SupplierDialog from '../components/SupplierDialog';
import { listSuppliers, saveSupplier } from '../services/cadastros';
import type { Supplier } from '../services/cadastros';
import {
  compareSuppliers, defaultSupplierDir, fmtDoc, fmtPhone, norm, toForm, whatsappUrl,
} from '../services/fornecedores';
import type { SupplierSort } from '../services/fornecedores';
import { useGestorAccess } from '../hooks/useGestorAccess';

const PAGE_SIZES = [25, 50, 100];
type StatusFilter = 'all' | 'active' | 'inactive';

const actionBtn =
  'inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-800';

export default function SuppliersPage() {
  const { can: allow } = useGestorAccess();
  const { storeId, loading: lojaLoading } = useLoja();
  const canEdit = allow('fornecedores', 'editar');

  const [all, setAll] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SupplierSort>('name');
  const [dir, setDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setErr('');
    try { setAll(await listSuppliers(storeId)); }
    catch (e) { setErr((e as Error).message || 'Erro ao carregar fornecedores'); }
    finally { setLoading(false); }
  }, [storeId]);

  useEffect(() => { if (!lojaLoading) void load(); }, [lojaLoading, load]);

  const filtered = useMemo(() => {
    const q = norm(search.trim());
    const qd = search.replace(/\D/g, '');
    const list = all.filter((s) => {
      if (status === 'active' && !s.active) return false;
      if (status === 'inactive' && s.active) return false;
      if (!q) return true;
      const text = norm([s.name, s.contact_name, s.email, s.payment_terms].filter(Boolean).join(' '));
      if (text.includes(q)) return true;
      return qd.length > 0 && (`${s.document ?? ''}${s.phone ?? ''}`.replace(/\D/g, '').includes(qd));
    });
    return [...list].sort((a, b) => compareSuppliers(a, b, sort, dir) || a.name.localeCompare(b.name, 'pt-BR'));
  }, [all, search, status, sort, dir]);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages - 1);
  const rows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const onSort = (key: string) => {
    const k = key as SupplierSort;
    if (k === sort) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(k); setDir(defaultSupplierDir()); }
    setPage(0);
  };

  const open = (s: Supplier | null) => { setEditing(s); setDialogOpen(true); };

  const toggleActive = async (s: Supplier) => {
    if (!storeId) return;
    setAll((p) => p.map((x) => (x.id === s.id ? { ...x, active: !s.active } : x)));
    try {
      await saveSupplier(storeId, s.id, { ...toForm(s), active: !s.active });
    } catch (e) {
      setAll((p) => p.map((x) => (x.id === s.id ? { ...x, active: s.active } : x)));
      showError((e as Error).message);
    }
  };

  const columns: SllColumn<Supplier>[] = [
    {
      key: 'name', sortKey: 'name', header: 'Fornecedor',
      render: (s) => (
        <>
          <p className={`text-sm font-bold ${s.active ? 'text-slate-800 dark:text-white' : 'text-slate-400 line-through'}`}>{s.name}</p>
          <p className="text-[11px] text-slate-400">{s.email ?? (s.phone ? fmtPhone(s.phone) : '-')}</p>
        </>
      ),
    },
    { key: 'doc', sortKey: 'document', header: 'CNPJ / CPF', render: (s) => <span className="font-mono text-slate-500">{fmtDoc(s.document)}</span> },
    {
      key: 'contact', sortKey: 'contact_name', header: 'Contato',
      render: (s) => (
        <>
          <p className="text-slate-700 dark:text-slate-200">{s.contact_name ?? '-'}</p>
          {s.phone && <p className="text-[11px] text-slate-400">{fmtPhone(s.phone)}</p>}
        </>
      ),
    },
    {
      key: 'lead', sortKey: 'lead_time_days', header: 'Prazo', align: 'right',
      render: (s) => <span className="font-mono text-slate-600 dark:text-slate-300">{s.lead_time_days != null ? `${s.lead_time_days} dia(s)` : '-'}</span>,
    },
    { key: 'pay', sortKey: 'payment_terms', header: 'Pagamento', render: (s) => <span className="text-slate-500">{s.payment_terms ?? '-'}</span> },
    {
      key: 'status', sortKey: 'active', header: 'Status', align: 'center', className: 'w-28',
      render: (s) => (
        <span onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            disabled={!canEdit}
            onClick={() => void toggleActive(s)}
            title={canEdit ? (s.active ? 'Clique para desativar' : 'Clique para ativar') : undefined}
            className={`h-7 w-[92px] rounded-lg border text-[10px] font-bold uppercase transition ${canEdit ? 'cursor-pointer' : 'cursor-default'} ${
              s.active
                ? 'border-[color:var(--sll-b-brand-border)] bg-[color:var(--sll-b-brand-soft)] text-[color:var(--sll-b-brand)]'
                : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800/40 dark:bg-rose-950/30 dark:text-rose-400'
            }`}
          >
            {s.active ? 'Ativo' : 'Inativo'}
          </button>
        </span>
      ),
    },
    {
      key: 'acoes', header: 'Ações', align: 'center', className: 'w-32',
      render: (s) => {
        const wa = whatsappUrl(s.phone);
        return (
          <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            {canEdit && (
              <button type="button" title="Editar" aria-label={'Editar ' + s.name} onClick={() => open(s)} className={actionBtn}><Pencil size={15} /></button>
            )}
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" title="WhatsApp" aria-label={'WhatsApp de ' + s.name} className={actionBtn}><MessageCircle size={15} /></a>
            )}
            {s.email && (
              <a href={`mailto:${s.email}`} title="E-mail" aria-label={'E-mail de ' + s.name} className={actionBtn}><Mail size={15} /></a>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fornecedores</h1>
          <p className="text-sm text-slate-500">Cadastro usado na reposição, nas compras e no custo dos produtos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allow('fornecedores', 'criar') && (
            <button type="button" onClick={() => open(null)} className={sllBtnPrimary}><Plus size={16} /> Novo fornecedor</button>
          )}
        </div>
      </div>

      <SllFilterBar>
        <SllSearch value={search} onChange={(v) => { setSearch(v); setPage(0); }} placeholder="Nome, CNPJ, contato, e-mail ou telefone..." />
        <SllField label="Status" className="w-48">
          <select value={status} onChange={(e) => { setStatus(e.target.value as StatusFilter); setPage(0); }} className={sllFieldCls + ' cursor-pointer'}>
            <option value="all">Todos</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </SllField>
      </SllFilterBar>

      {err && <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700">{err}</p>}

      <SllTable
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        sort={{ key: sort, dir }}
        onSort={onSort}
        onRowClick={canEdit ? (s) => open(s) : undefined}
        loading={loading || lojaLoading}
        empty={all.length === 0 ? 'Nenhum fornecedor cadastrado.' : 'Nenhum fornecedor encontrado.'}
        minWidth="60rem"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
          Linhas por página
          <div className="w-24">
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }} className={sllFieldCls + ' cursor-pointer'}>
              {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </label>
        <SllPager page={safePage} pages={pages} total={total} noun="fornecedor(es)" onPage={setPage} />
      </div>

      {storeId && (
        <SupplierDialog
          storeId={storeId}
          supplier={editing}
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}