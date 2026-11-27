import { useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Loader2, Lock, Unlock } from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { cn } from '@/lib/utils';
import { SllPageHeader } from '@/components/sll/SllPageHeader';
import { SllField, sllFieldCls } from '@/components/sll/SllFilterBar';
import { SllModal, sllBtnGhost, sllBtnPrimary } from '@/components/sll/SllModal';
import { SllTable } from '@/components/sll/SllTable';
import type { SllColumn } from '@/components/sll/SllTable';
import { showError, showSuccess } from '@/utils/toast';
import { useGestorAccess } from '@/modules/gestor/hooks/useGestorAccess';
import { mySaleChannels } from '@/modules/gestor/services/canaisVenda';
import type { SaleChannel } from '@/modules/gestor/services/canaisVenda';
import { brl } from '@/modules/gestor/services/clientes';
import {
  cashClose, cashCurrent, cashMove, cashOpen, listCashMoves, listCashSessions,
} from '../services/caixa';
import type { CashMove, CashSession, CloseResult } from '../services/caixa';

const dt = (v: string | null) => (v ? new Date(v).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '-');

/** Aceita 1234,56 / 1.234,56 / 1234.56. Vazio ou invalido = null. */
function toNum(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : null;
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: 'brand' }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={cn('mt-1 text-xl font-extrabold', tone === 'brand' ? 'text-[color:var(--sll-b-brand)]' : 'text-slate-800 dark:text-white')}>{value}</p>
    </div>
  );
}

function Card({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/50">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</h3>
        {actions}
      </div>
      {children}
    </section>
  );
}

export default function CashPage() {
  const { storeId, loading: lojaLoading } = useLoja();
  const { can } = useGestorAccess();
  const canOperate = can('pedidos', 'editar');

  const [channels, setChannels] = useState<SaleChannel[]>([]);
  const [channel, setChannel] = useState('');
  const [session, setSession] = useState<CashSession | null>(null);
  const [moves, setMoves] = useState<CashMove[]>([]);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [openAmt, setOpenAmt] = useState('');
  const [modal, setModal] = useState<null | 'suprimento' | 'sangria' | 'fechar'>(null);
  const [mvAmt, setMvAmt] = useState('');
  const [mvReason, setMvReason] = useState('');
  const [counted, setCounted] = useState('');
  const [note, setNote] = useState('');
  const [closed, setClosed] = useState<CloseResult | null>(null);
  const idem = useRef(crypto.randomUUID());

  const label = (c: string) => channels.find((x) => x.channel === c)?.label ?? c;

  useEffect(() => {
    if (!storeId || lojaLoading) return;
    let on = true;
    mySaleChannels(storeId)
      .then((l) => { if (on) { setChannels(l); setChannel((cur) => cur || l[0]?.channel || ''); if (l.length === 0) setLoading(false); } })
      .catch((e) => { showError((e as Error).message); if (on) setLoading(false); });
    return () => { on = false; };
  }, [storeId, lojaLoading]);

  const refresh = useCallback(async () => {
    if (!storeId || !channel) return;
    try {
      const [cur, hist] = await Promise.all([cashCurrent(storeId, channel), listCashSessions(storeId)]);
      setSession(cur);
      setHistory(hist);
      setMoves(cur ? await listCashMoves(cur.id) : []);
    } catch (e) {
      showError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [storeId, channel]);

  useEffect(() => { void refresh(); }, [refresh]);

  const openModal = (m: 'suprimento' | 'sangria' | 'fechar') => {
    idem.current = crypto.randomUUID();
    setMvAmt(''); setMvReason(''); setCounted(''); setNote('');
    setModal(m);
  };

  const doOpen = async () => {
    if (!storeId || !channel) return;
    const v = openAmt.trim() === '' ? 0 : toNum(openAmt);
    if (v === null) { showError('Valor de abertura inválido.'); return; }
    setBusy(true);
    try {
      await cashOpen(storeId, channel, v, idem.current);
      idem.current = crypto.randomUUID();
      setOpenAmt('');
      showSuccess('Caixa aberto.');
      await refresh();
    } catch (e) { showError((e as Error).message); }
    finally { setBusy(false); }
  };

  const doMove = async () => {
    if (!session || (modal !== 'suprimento' && modal !== 'sangria')) return;
    const v = toNum(mvAmt);
    if (v === null || v <= 0) { showError('Informe um valor maior que zero.'); return; }
    if (modal === 'sangria' && !mvReason.trim()) { showError('Informe o motivo da sangria.'); return; }
    if (modal === 'sangria' && session.totals && v > session.totals.expected) {
      showError(`A sangria é maior que o dinheiro esperado no caixa (${brl(session.totals.expected)}).`); return;
    }
    setBusy(true);
    try {
      await cashMove(session.id, modal, v, mvReason.trim(), idem.current);
      showSuccess(modal === 'sangria' ? 'Sangria registrada.' : 'Suprimento registrado.');
      setModal(null);
      await refresh();
    } catch (e) { showError((e as Error).message); }
    finally { setBusy(false); }
  };

  const doClose = async () => {
    if (!session) return;
    const v = toNum(counted);
    if (v === null) { showError('Informe o valor contado no caixa (use 0 se estiver vazio).'); return; }
    setBusy(true);
    try {
      const r = await cashClose(session.id, v, note.trim(), idem.current);
      setModal(null);
      setClosed(r);
      showSuccess('Caixa fechado.');
      await refresh();
    } catch (e) { showError((e as Error).message); }
    finally { setBusy(false); }
  };

  const moveCols: SllColumn<CashMove>[] = [
    { key: 'when', header: 'Hora', render: (m) => <span className="text-slate-500">{dt(m.created_at)}</span> },
    {
      key: 'kind', header: 'Tipo',
      render: (m) => (
        <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', m.kind === 'sangria' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-700')}>
          {m.kind === 'sangria' ? 'Sangria' : 'Suprimento'}
        </span>
      ),
    },
    { key: 'amount', header: 'Valor', render: (m) => <span className="font-mono font-bold">{brl(m.amount)}</span> },
    { key: 'reason', header: 'Motivo', align: 'left', render: (m) => <span className="text-slate-600 dark:text-slate-300">{m.reason || '-'}</span> },
  ];

  const histCols: SllColumn<CashSession>[] = [
    { key: 'opened', header: 'Abertura', render: (s) => <span className="text-slate-500">{dt(s.opened_at)}</span> },
    { key: 'closed', header: 'Fechamento', render: (s) => <span className="text-slate-500">{dt(s.closed_at)}</span> },
    { key: 'store', header: 'Loja', align: 'left', render: (s) => label(s.channel) },
    {
      key: 'status', header: 'Situação',
      render: (s) => (
        <span className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', s.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>
          {s.status === 'open' ? 'Aberto' : 'Fechado'}
        </span>
      ),
    },
    { key: 'exp', header: 'Esperado', render: (s) => <span className="font-mono">{s.expected_amount == null ? '-' : brl(s.expected_amount)}</span> },
    { key: 'cnt', header: 'Contado', render: (s) => <span className="font-mono">{s.counted_amount == null ? '-' : brl(s.counted_amount)}</span> },
    {
      key: 'diff', header: 'Diferença',
      render: (s) => s.difference == null ? <span className="text-slate-400">-</span> : (
        <span className={cn('font-mono font-bold', s.difference === 0 ? 'text-slate-500' : s.difference > 0 ? 'text-emerald-600' : 'text-rose-600')}>
          {s.difference > 0 ? '+' : ''}{brl(s.difference)}
        </span>
      ),
    },
  ];

  if (loading || lojaLoading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-[color:var(--sll-b-brand)]" /></div>;
  }

  if (channels.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-500 dark:border-slate-700 dark:bg-slate-800/50">
        Você não tem loja física liberada para operar o caixa. Peça ao administrador.
      </div>
    );
  }

  const t = session?.totals;
  const countedN = toNum(counted);
  const diff = session && t && countedN !== null ? Math.round((countedN - t.expected) * 100) / 100 : null;

  return (
    <div className="space-y-4">
      <SllPageHeader
        title="Caixa"
        subtitle="Abertura, suprimento, sangria e fechamento do dinheiro da loja."
        className="mb-0"
        actions={channels.length > 1 ? (
          <select className={sllFieldCls + ' w-56 cursor-pointer'} value={channel} onChange={(e) => { setLoading(true); setChannel(e.target.value); }}>
            {channels.map((c) => <option key={c.channel} value={c.channel}>{c.label}</option>)}
          </select>
        ) : undefined}
      />

      {!session ? (
        <Card title={`Caixa fechado · ${label(channel)}`}>
          <div className="flex flex-wrap items-end gap-3">
            <SllField label="Valor de abertura (troco inicial)" className="w-64">
              <input className={sllFieldCls} inputMode="decimal" placeholder="0,00" disabled={!canOperate || busy} value={openAmt} onChange={(e) => setOpenAmt(e.target.value)} />
            </SllField>
            <button type="button" disabled={!canOperate || busy} onClick={() => void doOpen()} className={sllBtnPrimary}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Unlock size={15} />} Abrir caixa
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-400">Cada operador tem o seu caixa por loja. As vendas em dinheiro feitas no PDV entram nele automaticamente.</p>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-500">
              Aberto em <strong>{dt(session.opened_at)}</strong> · {label(session.channel)}
            </p>
            {canOperate && (
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => openModal('suprimento')} className={sllBtnGhost}><ArrowDownCircle size={15} /> Suprimento</button>
                <button type="button" onClick={() => openModal('sangria')} className={sllBtnGhost}><ArrowUpCircle size={15} /> Sangria</button>
                <button type="button" onClick={() => openModal('fechar')} className={sllBtnPrimary}><Lock size={15} /> Fechar caixa</button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
            <Kpi label="Abertura" value={brl(t?.opening ?? session.opening_amount)} />
            <Kpi label="Vendas em dinheiro" value={brl(t?.cash_sales ?? 0)} />
            <Kpi label="Suprimentos" value={brl(t?.supplies ?? 0)} />
            <Kpi label="Sangrias" value={brl(t?.withdrawals ?? 0)} />
            <Kpi label="Vendas no caixa" value={String(t?.sales_count ?? 0)} />
            <Kpi label="Esperado em caixa" value={brl(t?.expected ?? session.opening_amount)} tone="brand" />
          </div>

          <Card title="Movimentos do caixa">
            <SllTable columns={moveCols} rows={moves} rowKey={(m) => m.id} empty="Nenhum suprimento ou sangria neste caixa." minWidth="32rem" />
          </Card>
        </>
      )}

      <Card title="Histórico de caixas">
        <SllTable columns={histCols} rows={history} rowKey={(s) => s.id} empty="Nenhum caixa aberto ainda." minWidth="48rem" />
      </Card>

      <SllModal
        open={modal === 'suprimento' || modal === 'sangria'}
        onOpenChange={(o) => { if (!o && !busy) setModal(null); }}
        title={modal === 'sangria' ? 'Sangria' : 'Suprimento'}
        size="md"
        footer={(
          <>
            <button type="button" disabled={busy} onClick={() => setModal(null)} className={sllBtnGhost}>Cancelar</button>
            <button type="button" disabled={busy} onClick={() => void doMove()} className={sllBtnPrimary}>
              {busy && <Loader2 size={15} className="animate-spin" />}Registrar
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-500">
            {modal === 'sangria' ? 'Retirada de dinheiro do caixa (ex.: levar ao banco). Reduz o valor esperado.' : 'Entrada de dinheiro no caixa (ex.: reforço de troco). Aumenta o valor esperado.'}
          </p>
          <SllField label="Valor (R$)">
            <input autoFocus className={sllFieldCls} inputMode="decimal" placeholder="0,00" value={mvAmt} onChange={(e) => setMvAmt(e.target.value)} />
          </SllField>
          <SllField label={modal === 'sangria' ? 'Motivo *' : 'Motivo (opcional)'}>
            <input className={sllFieldCls} value={mvReason} onChange={(e) => setMvReason(e.target.value)} />
          </SllField>
        </div>
      </SllModal>

      <SllModal
        open={modal === 'fechar'}
        onOpenChange={(o) => { if (!o && !busy) setModal(null); }}
        title="Fechar caixa"
        size="md"
        footer={(
          <>
            <button type="button" disabled={busy} onClick={() => setModal(null)} className={sllBtnGhost}>Cancelar</button>
            <button type="button" disabled={busy || countedN === null} onClick={() => void doClose()} className={sllBtnPrimary}>
              {busy && <Loader2 size={15} className="animate-spin" />}Fechar caixa
            </button>
          </>
        )}
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Conte o dinheiro que está na gaveta. Esperado pelo sistema: <strong>{brl(t?.expected ?? 0)}</strong>.
          </p>
          <SllField label="Valor contado (R$)">
            <input autoFocus className={sllFieldCls} inputMode="decimal" placeholder="0,00" value={counted} onChange={(e) => setCounted(e.target.value)} />
          </SllField>
          {diff !== null && (
            <p className={cn('rounded-xl px-3 py-2 text-sm font-semibold', diff === 0 ? 'bg-emerald-50 text-emerald-700' : diff > 0 ? 'bg-amber-50 text-amber-800' : 'bg-rose-50 text-rose-700')}>
              {diff === 0 ? 'Caixa conferido, sem diferença.' : diff > 0 ? `Sobra de ${brl(diff)}.` : `Falta de ${brl(Math.abs(diff))}.`}
            </p>
          )}
          <SllField label="Observação (opcional)">
            <textarea rows={2} className={sllFieldCls} value={note} onChange={(e) => setNote(e.target.value)} />
          </SllField>
          <p className="text-[11px] text-slate-400">Depois de fechado, o caixa não pode ser reaberto. Para vender de novo, abra um novo caixa.</p>
        </div>
      </SllModal>

      <SllModal
        open={!!closed}
        onOpenChange={(o) => { if (!o) setClosed(null); }}
        title="Caixa fechado"
        size="md"
        footer={<button type="button" onClick={() => setClosed(null)} className={sllBtnPrimary}>Fechar</button>}
      >
        {closed && (
          <div className="space-y-2 text-sm">
            <p>Esperado: <strong>{brl(closed.expected)}</strong></p>
            <p>Contado: <strong>{brl(closed.counted)}</strong></p>
            <p className={cn('font-bold', closed.difference === 0 ? 'text-emerald-600' : closed.difference > 0 ? 'text-amber-600' : 'text-rose-600')}>
              Diferença: {closed.difference > 0 ? '+' : ''}{brl(closed.difference)}
            </p>
            <p className="text-xs text-slate-400">{closed.totals.sales_count} venda(s) no caixa.</p>
          </div>
        )}
      </SllModal>
    </div>
  );
}