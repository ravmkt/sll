import StoreDetailPage from '@/components/admin/StoreDetailPage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, Loader2, Pencil, Power, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  deleteStore, listStores, setSubscriptionStatus,
  type AdminStoreRow, type StoreStatus,
} from '@/services/admin/storesService';
import { Badge, CARD, ContactButtons, DeleteStoreModal, ICON, dt, modLabel } from '@/components/admin/storeUi';

const BTN = 'rounded-lg p-1.5 transition-colors hover:bg-white/10 disabled:opacity-40';
const CHIPS: { id: 'all' | StoreStatus; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'active', label: 'Adimplentes' },
  { id: 'past_due', label: 'Inadimplentes' },
  { id: 'trial', label: 'Em trial' },
  { id: 'inactive', label: 'Inativas' },
];

function LojasList() {
  const [, setParams] = useSearchParams();
  const [rows, setRows] = useState<AdminStoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | StoreStatus>('all');
  const [mod, setMod] = useState('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [del, setDel] = useState<AdminStoreRow | null>(null);

  const open = (id: string, aba?: string) =>
    setParams(aba ? { tab: 'lojas', loja: id, aba } : { tab: 'lojas', loja: id });

  const load = useCallback(() => {
    setLoading(true);
    listStores()
      .then(setRows)
      .catch((e) => { toast.error('Erro ao listar lojas.'); console.error(e); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const counts = useMemo(() => {
    const c: Record<'all' | StoreStatus, number> = { all: rows.length, active: 0, past_due: 0, trial: 0, inactive: 0 };
    rows.forEach((r) => { c[r.status] += 1; });
    return c;
  }, [rows]);

  const modules = useMemo(() => Array.from(new Set(rows.flatMap((r) => r.modules))).sort(), [rows]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) =>
      (status === 'all' || r.status === status) &&
      (mod === 'all' || r.modules.includes(mod)) &&
      (!term || [r.name, r.url, r.contact_email, r.owner_email].some((v) => (v || '').toLowerCase().includes(term))));
  }, [rows, q, status, mod]);

  const togglePlan = async (r: AdminStoreRow) => {
    if (r.is_lifetime) {
      toast.info('Loja vitalícia: gerencie na aba Assinaturas.');
      open(r.id, 'assinaturas');
      return;
    }
    const cancel = r.status !== 'inactive';
    const targets = r.subs.filter((s) => (cancel ? s.status !== 'canceled' : s.status === 'canceled'));
    if (targets.length === 0) {
      toast.info('Sem assinatura atual para alterar. Abrindo a loja.');
      open(r.id, 'assinaturas');
      return;
    }
    const nome = r.name || 'esta loja';
    const txt = cancel ? `Cancelar ${targets.length} assinatura(s) de ${nome}?` : `Reativar ${targets.length} assinatura(s) de ${nome}?`;
    if (!window.confirm(`${txt}\nIsso altera só o SLL. Cobrança recorrente no Asaas deve ser cancelada lá.`)) return;
    setBusyId(r.id);
    try {
      for (const t of targets) await setSubscriptionStatus(t.id, cancel ? 'canceled' : 'active');
      toast.success('Plano atualizado.');
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar plano.');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!del) return;
    setBusyId(del.id);
    try {
      await deleteStore(del.id);
      toast.success('Loja excluída.');
      setDel(null);
      load();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível excluir a loja.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Lojas</h1>
        <p className="text-xs text-slate-500">{filtered.length} de {rows.length} lojas</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {CHIPS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setStatus(c.id)}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
              status === c.id ? 'border-[#fd8539] bg-[#fd8539]/15 text-white' : 'border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {c.label} <span className="ml-1 text-slate-500">{counts[c.id]}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${ICON}`} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, URL ou e-mail"
            className="w-full rounded-xl border border-white/10 bg-[#111524] py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#fd8539]"
          />
        </div>
        <select value={mod} onChange={(e) => setMod(e.target.value)} className="rounded-xl border border-white/10 bg-[#111524] px-3 py-2 text-xs text-white outline-none">
          <option value="all">Todos os módulos</option>
          {modules.map((m) => <option key={m} value={m}>{modLabel(m)}</option>)}
        </select>
      </div>

      <div className={`${CARD} overflow-x-auto p-0`}>
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className={`h-6 w-6 animate-spin ${ICON}`} /></div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Criada em</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Planos</th>
                <th className="px-4 py-3">Aplicativos</th>
                <th className="px-4 py-3">Indicações</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-500">Nenhuma loja encontrada.</td></tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="align-top hover:bg-white/5">
                  <td className="px-4 py-3">
                    <button type="button" onClick={() => open(r.id)} className="text-left font-bold text-white hover:text-[#fd8539]">
                      {r.name || 'Sem nome'}
                    </button>
                    <p className="text-[11px] text-slate-500">{r.url || '—'}</p>
                    <p className="text-[11px] text-slate-500">{r.owner_email || r.contact_email || 'sem e-mail'}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{dt(r.created_at)}</td>
                  <td className="px-4 py-3">
                    <Badge status={r.status} />
                    {r.is_lifetime && <p className="mt-1 text-[10px] font-bold text-sky-300">Vitalícia</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {r.plans.length === 0 ? <span className="text-slate-600">—</span> : r.plans.map((p) => <p key={p}>{p}</p>)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.modules.length === 0 ? <span className="text-slate-600">—</span> : r.modules.map((m) => (
                        <span key={m} className="rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-slate-300">{modLabel(m)}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400"><strong className="text-slate-200">{r.referrals_made}</strong> indicadas</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <button type="button" title="Detalhes" className={BTN} onClick={() => open(r.id)}><Eye size={16} className={ICON} /></button>
                      <button type="button" title="Editar" className={BTN} onClick={() => open(r.id, 'dados')}><Pencil size={16} className={ICON} /></button>
                      <button
                        type="button"
                        title={r.status === 'inactive' ? 'Ativar plano' : 'Cancelar plano'}
                        disabled={busyId === r.id}
                        className={BTN}
                        onClick={() => togglePlan(r)}
                      >
                        <Power size={16} className={r.status === 'inactive' ? 'text-emerald-400' : 'text-amber-400'} />
                      </button>
                      <ContactButtons whatsapp={r.whatsapp} email={r.owner_email || r.contact_email} />
                      <button type="button" title="Excluir" className={BTN} onClick={() => setDel(r)}><Trash2 size={16} className="text-rose-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {del && (
        <DeleteStoreModal name={del.name || 'excluir'} busy={busyId === del.id} onCancel={() => setDel(null)} onConfirm={confirmDelete} />
      )}
    </div>
  );
}

export function LojasTab() {
  const [params] = useSearchParams();
  const loja = params.get('loja');
  return loja ? <StoreDetailPage key={loja} storeId={loja} /> : <LojasList />;
}

export default LojasTab;