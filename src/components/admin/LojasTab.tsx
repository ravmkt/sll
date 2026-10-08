import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Loader2, Mail, MessageCircle, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  getStoreDetail, listStores, setStoreSubscription,
  type AdminStoreDetail, type AdminStoreRow, type StoreStatus,
} from '@/services/admin/storesService';

const CARD = 'rounded-2xl border border-white/10 bg-[#111524] p-4';
const ICON = 'text-[#fd8539]';

const STATUS_LABEL: Record<StoreStatus, string> = {
  active: 'Ativa', trial: 'Em trial', past_due: 'Inadimplente', inactive: 'Inativa',
};
const STATUS_STYLE: Record<StoreStatus, string> = {
  active: 'bg-emerald-500/15 text-emerald-300',
  trial: 'bg-sky-500/15 text-sky-300',
  past_due: 'bg-rose-500/15 text-rose-300',
  inactive: 'bg-slate-500/15 text-slate-300',
};

const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dt = (v?: string | null) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');
const mb = (b?: number | null) => `${((b || 0) / 1024 / 1024).toFixed(1)} MB`;
const digits = (v?: string | null) => (v || '').replace(/\D/g, '');

function Badge({ status }: { status: StoreStatus }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 py-2 text-xs last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-bold text-slate-200">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={CARD}>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
      {children}
    </div>
  );
}

function RaioX({ storeId, onClose, onChanged }: { storeId: string; onClose: () => void; onChanged: () => void }) {
  const [d, setD] = useState<AdminStoreDetail | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getStoreDetail(storeId).then(setD).catch((e) => { toast.error('Erro ao carregar a loja.'); console.error(e); });
  }, [storeId]);

  useEffect(() => { setD(null); load(); }, [load]);

  const change = async (status: 'active' | 'canceled') => {
    const txt = status === 'canceled' ? 'Cancelar as assinaturas atuais desta loja?' : 'Reativar as assinaturas atuais desta loja?';
    if (!window.confirm(`${txt}\nIsso altera o SLL, mas nao cancela nem cria cobranca no Asaas.`)) return;
    setBusy(true);
    try {
      const n = await setStoreSubscription(storeId, status);
      toast.success(`${n} assinatura(s) atualizada(s).`);
      load();
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao atualizar assinatura.');
    } finally {
      setBusy(false);
    }
  };

  const s = d?.store;
  const events = d ? Object.entries(d.events_30d) : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div className="h-full w-full max-w-xl space-y-3 overflow-y-auto border-l border-white/10 bg-[#0b0f1c] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-black text-white">{s?.name || 'Carregando...'}</h2>
            {s?.url && (
              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
                {s.url} <ExternalLink size={12} className={ICON} />
              </a>
            )}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-white/10"><X size={18} className={ICON} /></button>
        </div>

        {!d || !s ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className={`h-6 w-6 animate-spin ${ICON}`} /></div>
        ) : (
          <>
            <Section title="Conta">
              <Row label="E-mail do dono" value={s.owner_email || '—'} />
              <Row label="E-mail de atendimento" value={s.contact_email || '—'} />
              <Row label="WhatsApp do dono" value={s.whatsapp ? `+${digits(s.whatsapp)}` : '—'} />
              <Row label="Plataforma" value={s.platform || '—'} />
              <Row label="Cadastro" value={dt(s.created_at)} />
              <Row label="Último acesso" value={dt(s.last_sign_in_at)} />
            </Section>

            <Section title="Assinaturas">
              {d.subscriptions.length === 0 && <p className="text-xs text-slate-500">Nenhuma assinatura.</p>}
              {d.subscriptions.map((sub) => (
                <Row
                  key={sub.id}
                  label={`${sub.plan_name || sub.module_key || 'Plano'}${sub.is_current ? '' : ' (anterior)'}`}
                  value={`${sub.status}${sub.billing_cycle ? ` · ${sub.billing_cycle}` : ''}`}
                />
              ))}
              <div className="mt-3 flex gap-2">
                <button disabled={busy} onClick={() => change('active')} className="rounded-lg bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-300 hover:bg-emerald-500/25 disabled:opacity-50">Reativar</button>
                <button disabled={busy} onClick={() => change('canceled')} className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-bold text-rose-300 hover:bg-rose-500/25 disabled:opacity-50">Cancelar</button>
              </div>
            </Section>

            <Section title="Uso">
              <Row label="Armazenamento" value={`${mb(s.storage_used_bytes)} de ${mb(s.storage_limit_bytes)}`} />
              {events.length === 0 && <p className="pt-2 text-xs text-slate-500">Sem eventos nos últimos 30 dias.</p>}
              {events.map(([k, v]) => <Row key={k} label={`Eventos: ${k}`} value={v} />)}
            </Section>

            <Section title="Financeiro">
              <Row label="Total pago" value={brl(d.paid_cents)} />
              <Row label="Em aberto" value={brl(d.open_cents)} />
              {d.invoices.map((i) => (
                <Row key={i.id} label={`${i.description || 'Fatura'} · ${dt(i.due_date)}`} value={`${brl(i.amount_cents)} · ${i.paid_at ? 'paga' : i.status}`} />
              ))}
            </Section>

            <Section title="Indicações">
              <Row label="Indicações feitas" value={d.referrals.count} />
              <Row label="Comissões" value={brl(Number(d.referrals.total) * 100)} />
            </Section>

            <Section title="Log do Master">
              {d.audit.length === 0 && <p className="text-xs text-slate-500">Nenhuma ação registrada.</p>}
              {d.audit.map((a, i) => <Row key={i} label={a.action} value={dt(a.created_at)} />)}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}

export default function LojasTab() {
  const [rows, setRows] = useState<AdminStoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | StoreStatus>('all');
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listStores().then(setRows).catch((e) => { toast.error('Erro ao listar lojas.'); console.error(e); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) =>
      (status === 'all' || r.status === status) &&
      (!term || [r.name, r.url, r.contact_email, r.owner_email].some((v) => (v || '').toLowerCase().includes(term))));
  }, [rows, q, status]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Lojas</h1>
        <p className="text-xs text-slate-500">{filtered.length} de {rows.length} lojas</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${ICON}`} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome, URL ou e-mail"
            className="w-full rounded-xl border border-white/10 bg-[#111524] py-2 pl-9 pr-3 text-xs text-white outline-none focus:border-[#fd8539]" />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value as 'all' | StoreStatus)}
          className="rounded-xl border border-white/10 bg-[#111524] px-3 py-2 text-xs text-white outline-none">
          <option value="all">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="trial">Em trial</option>
          <option value="past_due">Inadimplentes</option>
          <option value="inactive">Inativas</option>
        </select>
      </div>

      <div className={`${CARD} overflow-x-auto p-0`}>
        {loading ? (
          <div className="flex h-40 items-center justify-center"><Loader2 className={`h-6 w-6 animate-spin ${ICON}`} /></div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Loja</th><th className="px-4 py-3">Plano</th><th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Contato</th><th className="px-4 py-3">Cadastro</th><th className="px-4 py-3">Último acesso</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhuma loja encontrada.</td></tr>
              )}
              {filtered.map((r) => {
                const wa = digits(r.whatsapp);
                const mail = r.contact_email || r.owner_email;
                return (
                  <tr key={r.id} onClick={() => setOpenId(r.id)} className="cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/5">
                    <td className="px-4 py-3">
                      <p className="font-bold text-white">{r.name || 'Sem nome'}</p>
                      <p className="text-[11px] text-slate-500">{r.url || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{r.plans.length ? r.plans.join(', ') : '—'}</td>
                    <td className="px-4 py-3"><Badge status={r.status} /></td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" title="WhatsApp"><MessageCircle size={16} className={ICON} /></a>}
                        {mail && <a href={`mailto:${mail}`} title={mail}><Mail size={16} className={ICON} /></a>}
                        {!wa && !mail && <span className="text-slate-600">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">{dt(r.created_at)}</td>
                    <td className="px-4 py-3 text-slate-400">{dt(r.last_sign_in_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {openId && <RaioX storeId={openId} onClose={() => setOpenId(null)} onChanged={load} />}
    </div>
  );
}