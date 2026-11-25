import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Eye, Mail, MessageCircle, Pencil, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { SllPageHeader } from '@/components/sll/SllPageHeader';
import { SllFilterBar, SllField, SllSearch, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllPeriodFilter, PERIOD_ALL, periodRange } from '@/components/sll/SllPeriodFilter';
import type { PeriodValue } from '@/components/sll/SllPeriodFilter';
import { SllTable, SllPager } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { showError, showSuccess } from '@/utils/toast';
import ProposalModal from '../components/ProposalModal';
import type { SellerOption } from '../components/ProposalModal';
import {
  PROPOSAL_STATUSES, PROPOSAL_STATUS_CLS, PROPOSAL_STATUS_LABEL, PROPOSAL_TRANSITIONS, brl, canConvertProposal,
  canDeleteProposal, canEditProposal, convertProposal, deleteProposal, duplicateProposal, expireProposals, fmtDay,
  getProposal, listProposals, mailtoLink, setProposalStatus, whatsappLink,
} from '../services/propostas';
import type { Proposal, ProposalStatus } from '../services/propostas';

import { openProposalPrint } from '../services/proposalPrintAction';
const sb: any = supabase;
const PAGE = 25;
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Erro inesperado.');
const memberLabel = (m: any) => m.name || m.full_name || m.display_name || m.email || m.role || 'Membro';

async function resolveStore(): Promise<{ storeId: string; uid: string } | null> {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  const { data: own } = await sb.from('stores').select('id').eq('owner_user_id', uid).limit(1);
  if (own?.[0]) return { storeId: own[0].id, uid };
  const { data: mem } = await sb.from('store_members').select('store_id').eq('user_id', uid).limit(1);
  return mem?.[0] ? { storeId: mem[0].store_id, uid } : null;
}

type Confirm = { kind: 'delete' | 'convert'; p: Proposal } | null;
type Sort = { key: string; dir: 'asc' | 'desc' };

const iconBtn = 'cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-[color:var(--sll-b-brand)] dark:hover:bg-slate-700';

export default function ProposalsPage() {
  const navigate = useNavigate();
  const [ctx, setCtx] = useState<{ storeId: string; uid: string } | null>(null);
  const [noStore, setNoStore] = useState(false);
  const [perms, setPerms] = useState({ create: false, edit: false, del: false });
  const [sellers, setSellers] = useState<SellerOption[]>([]);

  const [rows, setRows] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodValue>(PERIOD_ALL);
  const [sellerId, setSellerId] = useState('all');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProposalStatus | 'all'>('all');
  const [sort, setSort] = useState<Sort>({ key: 'number', dir: 'desc' });
  const [page, setPage] = useState(0);

  const [modal, setModal] = useState<{ id: string | null } | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, setBusy] = useState(false);

  // loja, permissoes e vendedores
  useEffect(() => {
    resolveStore().then(async (c) => {
      if (!c) { setNoStore(true); setLoading(false); return; }
      setCtx(c);
      const can = (a: string) => sb.rpc('gestor_can', { p_store: c.storeId, p_area: 'pedidos', p_action: a })
        .then((r: any) => !!r.data);
      const [create, edit, del] = await Promise.all([can('criar'), can('editar'), can('excluir')]);
      setPerms({ create, edit, del });
      const { data: mem } = await sb.from('store_members').select('*').eq('store_id', c.storeId);
      const list = new Map<string, string>();
      ((mem || []) as any[]).forEach((m) => { if (m.user_id) list.set(m.user_id, memberLabel(m)); });
      if (!list.has(c.uid)) list.set(c.uid, 'Eu');
      setSellers([...list].map(([id, label]) => ({ id, label })));
    });
  }, []);

  const load = useCallback(async () => {
    if (!ctx) return;
    setLoading(true);
    try {
      await expireProposals(ctx.storeId);
      const { from, to } = periodRange(period);
      setRows(await listProposals(ctx.storeId, { from, to, sellerId }));
    } catch (e) { showError(msg(e)); } finally { setLoading(false); }
  }, [ctx, period, sellerId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setPage(0); }, [period, sellerId, search, status, sort]);

  const sellerName = useMemo(() => new Map(sellers.map((s) => [s.id, s.label])), [sellers]);

  const searched = useMemo(() => {
    const s = search.trim().toLowerCase().replace('#', '');
    if (!s) return rows;
    return rows.filter((p) => p.customer_name.toLowerCase().includes(s) || String(p.number).includes(s));
  }, [rows, search]);

  const stats = useMemo(() => {
    const m = new Map<ProposalStatus | 'all', { n: number; v: number }>();
    m.set('all', { n: searched.length, v: searched.reduce((s, p) => s + p.total, 0) });
    PROPOSAL_STATUSES.forEach((st) => {
      const l = searched.filter((p) => p.status === st);
      m.set(st, { n: l.length, v: l.reduce((s, p) => s + p.total, 0) });
    });
    return m;
  }, [searched]);

  const sorted = useMemo(() => {
    const list = searched.filter((p) => status === 'all' || p.status === status);
    const get: Record<string, (p: Proposal) => string | number> = {
      number: (p) => p.number,
      customer: (p) => p.customer_name.toLowerCase(),
      total: (p) => p.total,
      valid: (p) => p.valid_until || '',
      created: (p) => p.created_at,
    };
    const g = get[sort.key] || get.number;
    return [...list].sort((a, b) => {
      const x = g(a), y = g(b);
      return (x < y ? -1 : x > y ? 1 : 0) * (sort.dir === 'asc' ? 1 : -1);
    });
  }, [searched, status, sort]);

  const pages = Math.max(Math.ceil(sorted.length / PAGE), 1);
  const view = sorted.slice(page * PAGE, page * PAGE + PAGE);

  const onSort = (key: string) => setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try { await fn(); if (ok) showSuccess(ok); await load(); } catch (e) { showError(msg(e)); } finally { setBusy(false); }
  };

  const openWhats = async (p: Proposal) => {
    try {
      const { proposal, items } = await getProposal(p.id);
      const url = whatsappLink(proposal, items);
      if (!url) { showError('Cliente sem telefone cadastrado.'); return; }
      window.open(url, '_blank', 'noopener');
    } catch (e) { showError(msg(e)); }
  };

  const openMail = async (p: Proposal) => {
    try {
      const { proposal, items } = await getProposal(p.id);
      const url = mailtoLink(proposal, items);
      if (!url) { showError('Cliente sem e-mail cadastrado.'); return; }
      window.location.href = url;
    } catch (e) { showError(msg(e)); }
  };

  const doConfirm = async () => {
    if (!confirm) return;
    const { kind, p } = confirm;
    setBusy(true);
    try {
      if (kind === 'delete') {
        await deleteProposal(p.id);
        showSuccess('Proposta excluída.');
        setConfirm(null);
        await load();
      } else {
        await convertProposal(p.id);
        showSuccess('Pedido criado a partir da proposta.');
        setConfirm(null);
        navigate('/dashboard/modules/gestor/pedidos');
      }
    } catch (e) { showError(msg(e)); } finally { setBusy(false); }
  };

  const columns: SllColumn<Proposal>[] = [
    { key: 'number', header: 'Nº', sortKey: 'number', render: (p) => <b>#{p.number}</b> },
    { key: 'customer', header: 'Cliente', sortKey: 'customer', align: 'left', render: (p) => <span className="font-semibold">{p.customer_name}</span> },
    { key: 'seller', header: 'Vendedor', render: (p) => (p.seller_id ? sellerName.get(p.seller_id) || '-' : '-') },
    {
      key: 'status', header: 'Status',
      render: (p) => <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ${PROPOSAL_STATUS_CLS[p.status]}`}>{PROPOSAL_STATUS_LABEL[p.status]}</span>,
    },
    { key: 'valid', header: 'Validade', sortKey: 'valid', render: (p) => fmtDay(p.valid_until) },
    { key: 'total', header: 'Total', sortKey: 'total', render: (p) => <b>{brl(p.total)}</b> },
    { key: 'created', header: 'Criada em', sortKey: 'created', render: (p) => fmtDay(p.created_at) },
    {
      key: 'actions', header: 'Ações',
      render: (p) => {
        const trans = PROPOSAL_TRANSITIONS[p.status];
        const editable = canEditProposal(p.status) && perms.edit;
        return (
          <div className="flex items-center justify-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button type="button" title={editable ? 'Editar' : 'Ver'} onClick={() => setModal({ id: p.id })} className={iconBtn}>
              {editable ? <Pencil size={15} /> : <Eye size={15} />}
            </button>
            <button type="button" title="Enviar por WhatsApp" onClick={() => void openWhats(p)} className={iconBtn}><MessageCircle size={15} /></button>
            <button type="button" title="Enviar por e-mail" onClick={() => void openMail(p)} className={iconBtn}><Mail size={15} /></button>
            <button type="button" title="Imprimir proposta" onClick={() => void openProposalPrint(p.store_id, p.id)} className={iconBtn}><Printer size={15} /></button>
            {perms.create && (
              <button type="button" title="Duplicar" disabled={busy} onClick={() => ctx && void act(async () => { const id = await duplicateProposal(ctx.storeId, p.id); setModal({ id }); }, 'Proposta duplicada como rascunho.')} className={iconBtn}>
                <Copy size={15} />
              </button>
            )}
            {perms.edit && canConvertProposal(p.status) && (
              <button type="button" title="Converter em pedido" onClick={() => setConfirm({ kind: 'convert', p })} className={iconBtn}><ShoppingCart size={15} /></button>
            )}
            {perms.edit && trans.length > 0 && (
              <select
                aria-label="Mudar status" value="" disabled={busy}
                onChange={(e) => { const to = e.target.value as ProposalStatus; if (to) void act(() => setProposalStatus(p.id, to), 'Status atualizado.'); }}
                className="ml-1 w-24 cursor-pointer rounded-lg border border-slate-200 bg-white px-1 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">Mover…</option>
                {trans.map((t) => <option key={t.to} value={t.to}>{t.label}</option>)}
              </select>
            )}
            {perms.del && canDeleteProposal(p.status) && (
              <button type="button" title="Excluir" onClick={() => setConfirm({ kind: 'delete', p })} className={cn(iconBtn, 'hover:text-red-600')}><Trash2 size={15} /></button>
            )}
          </div>
        );
      },
    },
  ];

  if (noStore) return <p className="p-6 text-sm font-semibold text-slate-500">Nenhuma loja vinculada a este usuário.</p>;

  const cardKeys: (ProposalStatus | 'all')[] = ['all', ...PROPOSAL_STATUSES];

  return (
    <div className="space-y-5 p-6">
      <SllPageHeader
        title="Propostas Comerciais"
        subtitle="Monte orçamentos, acompanhe a resposta do cliente e converta em pedido."
        actions={perms.create && (
          <button type="button" className={sllBtnPrimary} onClick={() => setModal({ id: null })}><Plus size={16} />Nova proposta</button>
        )}
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {cardKeys.map((k) => {
          const s = stats.get(k)!;
          const on = status === k;
          return (
            <button
              key={k} type="button" onClick={() => setStatus(k)}
              className={cn(
                'cursor-pointer rounded-xl border bg-white p-3 text-left shadow-sm transition-colors dark:bg-slate-800/50',
                on ? 'border-[color:var(--sll-b-brand)]' : 'border-slate-200 hover:border-[color:var(--sll-b-brand-border)] dark:border-slate-700',
              )}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{k === 'all' ? 'Todas' : PROPOSAL_STATUS_LABEL[k]}</div>
              <div className="mt-1 text-xl font-extrabold">{s.n}</div>
              <div className="text-xs font-semibold text-slate-500">{brl(s.v)}</div>
            </button>
          );
        })}
      </div>

      <SllFilterBar>
        <SllSearch value={search} onChange={setSearch} placeholder="Cliente ou nº da proposta" />
        <SllPeriodFilter value={period} onChange={setPeriod} label="Criada em" />
        <SllField label="Vendedor" className="w-56">
          <select value={sellerId} onChange={(e) => setSellerId(e.target.value)} className={cn(sllFieldCls, 'cursor-pointer')}>
            <option value="all">Todos</option>
            {sellers.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </SllField>
      </SllFilterBar>

      <SllTable
        columns={columns} rows={view} rowKey={(p) => p.id} loading={loading} sort={sort} onSort={onSort}
        onRowClick={(p) => setModal({ id: p.id })} empty="Nenhuma proposta encontrada." minWidth="62rem"
      />
      <SllPager page={page} pages={pages} total={sorted.length} noun="proposta(s)" onPage={setPage} />

      {modal && ctx && (
        <ProposalModal
          storeId={ctx.storeId} proposalId={modal.id} sellers={sellers} defaultSellerId={ctx.uid}
          onClose={() => setModal(null)} onSaved={() => void load()}
        />
      )}

      {confirm && (
        <SllModal
          open size="md" onOpenChange={(o) => { if (!o && !busy) setConfirm(null); }}
          title={confirm.kind === 'delete' ? 'Excluir proposta' : 'Converter em pedido'}
          footer={
            <>
              <button type="button" className={sllBtnGhost} disabled={busy} onClick={() => setConfirm(null)}>Cancelar</button>
              {confirm.kind === 'delete' ? (
                <button type="button" disabled={busy} onClick={() => void doConfirm()} className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">Excluir</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void doConfirm()} className={sllBtnPrimary}>Converter</button>
              )}
            </>
          }
        >
          <p className="text-sm">
            {confirm.kind === 'delete'
              ? <>Excluir a proposta <b>#{confirm.p.number}</b> de <b>{confirm.p.customer_name}</b>? Essa ação não pode ser desfeita.</>
              : <>Criar um pedido de <b>{brl(confirm.p.total)}</b> para <b>{confirm.p.customer_name}</b> a partir da proposta <b>#{confirm.p.number}</b>? O estoque não é alterado.</>}
          </p>
        </SllModal>
      )}
    </div>
  );
}