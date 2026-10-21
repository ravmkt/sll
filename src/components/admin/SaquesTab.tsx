import { useCallback, useEffect, useState } from 'react';
import { Copy, Wallet, X } from 'lucide-react';
import {
  adminListWithdrawals,
  adminProcessWithdrawal,
  WITHDRAWAL_STATUS_LABEL,
  type WithdrawalAction,
  type WithdrawalRow,
  type WithdrawalSummary,
} from '@/services/admin/adminWithdrawals';

const FILTERS = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'approved', label: 'Aprovados' },
  { key: 'paid', label: 'Pagos' },
  { key: 'rejected', label: 'Rejeitados' },
  { key: '', label: 'Todos' },
];

const STATUS_CLS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-300',
  approved: 'bg-sky-500/15 text-sky-300',
  paid: 'bg-emerald-500/15 text-emerald-300',
  rejected: 'bg-red-500/15 text-red-300',
};

const ACTION_TITLE: Record<WithdrawalAction, string> = {
  approve: 'Aprovar saque',
  pay: 'Marcar como pago',
  reject: 'Rejeitar saque',
};

const brl = (n: number) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmt = (d: string | null) => (d ? new Date(d).toLocaleString('pt-BR') : '—');

export default function SaquesTab() {
  const [filter, setFilter] = useState('pending');
  const [rows, setRows] = useState<WithdrawalRow[]>([]);
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [modal, setModal] = useState<{ row: WithdrawalRow; action: WithdrawalAction } | null>(null);
  const [notes, setNotes] = useState('');
  const [proof, setProof] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminListWithdrawals(filter || null, 100, 0);
      setRows(r.rows || []);
      setSummary(r.summary);
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao carregar saques.' });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openModal = (row: WithdrawalRow, action: WithdrawalAction) => {
    setNotes('');
    setProof('');
    setModal({ row, action });
  };

  const submit = async () => {
    if (!modal) return;
    if (modal.action === 'reject' && !notes.trim()) {
      setMsg({ type: 'err', text: 'Informe o motivo da rejeição.' });
      return;
    }
    setBusy(true);
    try {
      await adminProcessWithdrawal(modal.row.id, modal.action, notes, proof);
      setMsg({ type: 'ok', text: `${ACTION_TITLE[modal.action]}: concluído.` });
      setModal(null);
      await load();
    } catch (e) {
      setMsg({ type: 'err', text: e instanceof Error ? e.message : 'Erro ao processar saque.' });
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg({ type: 'ok', text: 'Chave PIX copiada.' });
    } catch {
      setMsg({ type: 'err', text: 'Não foi possível copiar.' });
    }
  };

  const card = 'rounded-2xl border border-slate-800 bg-[#0f1322] p-4';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fd8539]/15">
          <Wallet className="h-5 w-5 text-[#fd8539]" />
        </div>
        <div>
          <h1 className="text-xl font-black text-white">Saques de afiliados</h1>
          <p className="text-sm text-slate-400">Só comissões liberadas (após a carência de 14 dias) entram no saldo sacável.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className={card}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Pendentes</p>
          <p className="mt-1 text-2xl font-black text-amber-300">{brl(summary?.pending_amount || 0)}</p>
          <p className="text-xs text-slate-500">{summary?.pending_count || 0} pedido(s)</p>
        </div>
        <div className={card}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Aprovados a pagar</p>
          <p className="mt-1 text-2xl font-black text-sky-300">{brl(summary?.approved_amount || 0)}</p>
          <p className="text-xs text-slate-500">{summary?.approved_count || 0} pedido(s)</p>
        </div>
        <div className={card}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total pago</p>
          <p className="mt-1 text-2xl font-black text-emerald-300">{brl(summary?.paid_amount || 0)}</p>
          <p className="text-xs text-slate-500">desde o início</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`cursor-pointer rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
              filter === f.key ? 'bg-[#0094eb] text-white' : 'bg-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-sm font-semibold ${
          msg.type === 'ok' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
        }`}>
          {msg.text}
          <button type="button" onClick={() => setMsg(null)} className="cursor-pointer" aria-label="Fechar"><X size={16} /></button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0f1322]">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Solicitado em</th>
              <th className="px-4 py-3">Loja</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">PIX</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Nenhum saque neste filtro.</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-800/60 align-top last:border-0">
                <td className="px-4 py-3 text-slate-300">{fmt(r.requested_at)}</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{r.store_name || 'Loja'}</p>
                  <p className="text-xs text-slate-500">{r.owner_email || '—'}</p>
                </td>
                <td className="px-4 py-3 font-bold text-white">{brl(r.amount)}</td>
                <td className="px-4 py-3">
                  <p className="text-xs uppercase text-slate-500">{r.pix_key_type}</p>
                  <button type="button" onClick={() => copy(r.pix_key)} className="flex cursor-pointer items-center gap-1.5 break-all text-left text-slate-200 hover:text-white">
                    {r.pix_key}<Copy size={13} className="shrink-0 text-[#fd8539]" />
                  </button>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${STATUS_CLS[r.status] || ''}`}>
                    {WITHDRAWAL_STATUS_LABEL[r.status] || r.status}
                  </span>
                  {r.processed_at && <p className="mt-1 text-xs text-slate-500">{fmt(r.processed_at)}</p>}
                  {r.admin_notes && <p className="mt-1 max-w-[220px] text-xs text-slate-400">{r.admin_notes}</p>}
                  {r.proof_url && (
                    <a href={r.proof_url} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs text-[#0094eb] hover:underline">Ver comprovante</a>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {r.status === 'pending' && (
                      <button type="button" onClick={() => openModal(r, 'approve')} className="cursor-pointer rounded-lg bg-[#0094eb] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#007fcc]">Aprovar</button>
                    )}
                    {r.status === 'approved' && (
                      <button type="button" onClick={() => openModal(r, 'pay')} className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500">Marcar pago</button>
                    )}
                    {(r.status === 'pending' || r.status === 'approved') && (
                      <button type="button" onClick={() => openModal(r, 'reject')} className="cursor-pointer rounded-lg bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/25">Rejeitar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !busy && setModal(null)}>
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-700 bg-[#0f1322] p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-black text-white">{ACTION_TITLE[modal.action]}</h3>
            <div className="rounded-xl bg-white/5 p-3 text-sm text-slate-300">
              <p><b className="text-white">{modal.row.store_name || 'Loja'}</b> · {brl(modal.row.amount)}</p>
              <p className="break-all text-xs text-slate-500">PIX ({modal.row.pix_key_type}): {modal.row.pix_key}</p>
            </div>

            {modal.action === 'pay' && (
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">Link do comprovante (opcional)</label>
                <input value={proof} onChange={(e) => setProof(e.target.value)} placeholder="https://..." className="w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-white outline-none focus:border-[#0094eb]" />
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-500">
                {modal.action === 'reject' ? 'Motivo da rejeição (obrigatório)' : 'Observação (opcional)'}
              </label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-white outline-none focus:border-[#0094eb]" />
            </div>

            {modal.action === 'reject' && (
              <p className="text-xs text-slate-500">Ao rejeitar, o valor volta para o saldo do afiliado.</p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" disabled={busy} onClick={() => setModal(null)} className="cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white">Cancelar</button>
              <button type="button" disabled={busy} onClick={submit} className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-2 text-sm font-bold text-white hover:bg-[#007fcc] disabled:opacity-60">
                {busy ? 'Processando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}