import { useCallback, useEffect, useState } from 'react';
import { Eye, FileText, Plus, Settings } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { cn } from '@/lib/utils';
import { SllPageHeader } from '@/components/sll/SllPageHeader';
import { SllField, SllFilterBar, SllSearch, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllPager, SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { showError } from '@/utils/toast';
import { useGestorAccess } from '../hooks/useGestorAccess';
import {
  NF_PAGE_SIZE, NF_STATUSES, NF_STATUS_LABEL, brl, countByStatus, fmtDoc, fmtNumber, listNotas,
} from '../services/notas';
import type { NfNota, NfStatus } from '../services/notas';
import {
  NotaDetailModal, NotaInutilizarModal, NotaRegisterModal, NotaSettingsModal, StatusBadge, fmtDay,
} from '../components/NotasModals';

const AREA = 'notas_fiscais';

function nextDay(d: string): string {
  const t = new Date(d + 'T00:00:00');
  t.setDate(t.getDate() + 1);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
}

export default function NotasFiscaisPage() {
  const { storeId } = useLoja();
  const { can } = useGestorAccess();
  const canCreate = can(AREA, 'criar');
  const canEdit = can(AREA, 'editar');

  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<NfStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<NfNota[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<NfStatus, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [inutOpen, setInutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { setQ(search); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!storeId) return;
    let on = true;
    setLoading(true);
    listNotas(storeId, { search: q, status, from: from || null, to: to ? nextDay(to) : null, page })
      .then((r) => { if (on) { setRows(r.rows); setTotal(r.total); } })
      .catch((e) => { if (on) showError(e instanceof Error ? e.message : 'Erro ao carregar notas.'); })
      .finally(() => { if (on) setLoading(false); });
    return () => { on = false; };
  }, [storeId, q, status, from, to, page, tick]);

  useEffect(() => {
    if (!storeId) return;
    countByStatus(storeId).then(setCounts).catch(() => setCounts(null));
  }, [storeId, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const pages = Math.max(1, Math.ceil(total / NF_PAGE_SIZE));

  const cols: SllColumn<NfNota>[] = [
    { key: 'number', header: 'Número', render: (n) => <span className="font-mono font-bold">{fmtNumber(n)}</span> },
    { key: 'issued', header: 'Emissão', render: (n) => fmtDay(n.issued_at) },
    {
      key: 'to', header: 'Destinatário', align: 'left',
      render: (n) => (
        <div>
          <div className="font-semibold text-slate-800 dark:text-slate-100">{n.recipient_name || '-'}</div>
          <div className="text-[11px] text-slate-500">{n.recipient_document ? fmtDoc(n.recipient_document) : ''}</div>
        </div>
      ),
    },
    { key: 'total', header: 'Valor', render: (n) => <b>{brl(n.total)}</b> },
    { key: 'channel', header: 'Canal', render: (n) => n.channel || '-' },
    { key: 'status', header: 'Situação', render: (n) => <StatusBadge s={n.status} /> },
    {
      key: 'actions', header: 'Ações',
      render: (n) => (
        <button
          type="button" title="Ver detalhes" onClick={(e) => { e.stopPropagation(); setDetailId(n.id); }}
          className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-[color:var(--sll-b-brand-soft)] hover:text-[color:var(--sll-b-brand)]"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  if (!storeId) return null;

  return (
    <div className="space-y-5">
      <SllPageHeader
        title="Notas Fiscais"
        subtitle="Controle das notas fiscais dos pedidos."
        actions={
          <>
            {canEdit && (
              <button type="button" className={sllBtnGhost} onClick={() => setSettingsOpen(true)}>
                <Settings size={15} /> Configuração
              </button>
            )}
            {canEdit && (
              <button type="button" className={sllBtnGhost} onClick={() => setInutOpen(true)}>
                <FileText size={15} /> Inutilizar numeração
              </button>
            )}
            {canCreate && (
              <button type="button" className={sllBtnPrimary} onClick={() => setRegisterOpen(true)}>
                <Plus size={15} /> Registrar nota
              </button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {NF_STATUSES.map((s) => {
          const on = status === s;
          return (
            <button
              key={s} type="button"
              onClick={() => { setStatus(on ? '' : s); setPage(0); }}
              className={cn(
                'cursor-pointer rounded-xl border bg-white p-3 text-left shadow-sm transition-colors dark:bg-slate-800/50',
                on
                  ? 'border-[color:var(--sll-b-brand)] ring-1 ring-[color:var(--sll-b-brand)]'
                  : 'border-slate-200 hover:border-[color:var(--sll-b-brand)] dark:border-slate-700',
              )}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{NF_STATUS_LABEL[s]}</div>
              <div className="mt-1 text-xl font-extrabold text-slate-800 dark:text-white">{counts ? counts[s] : '-'}</div>
            </button>
          );
        })}
      </div>

      <SllFilterBar>
        <SllSearch value={search} onChange={setSearch} placeholder="Destinatário, CPF/CNPJ, número ou chave" />
        <SllField label="De">
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={sllFieldCls} />
        </SllField>
        <SllField label="Até">
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={sllFieldCls} />
        </SllField>
        <SllField label="Situação">
          <select value={status} onChange={(e) => { setStatus(e.target.value as NfStatus | ''); setPage(0); }} className={sllFieldCls}>
            <option value="">Todas</option>
            {NF_STATUSES.map((s) => <option key={s} value={s}>{NF_STATUS_LABEL[s]}</option>)}
          </select>
        </SllField>
      </SllFilterBar>

      <SllTable
        columns={cols} rows={rows} rowKey={(n) => n.id} loading={loading}
        onRowClick={(n) => setDetailId(n.id)}
        empty="Nenhuma nota fiscal encontrada."
      />
      <SllPager page={page} pages={pages} total={total} noun="nota(s)" onPage={setPage} />

      {detailId && <NotaDetailModal notaId={detailId} canEdit={canEdit} onClose={() => setDetailId(null)} onChanged={reload} />}
      {registerOpen && <NotaRegisterModal storeId={storeId} onClose={() => setRegisterOpen(false)} onSaved={reload} />}
      {inutOpen && <NotaInutilizarModal storeId={storeId} onClose={() => setInutOpen(false)} onSaved={reload} />}
      {settingsOpen && <NotaSettingsModal storeId={storeId} onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}