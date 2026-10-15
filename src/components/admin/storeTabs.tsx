import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  changePlan, createSubscription, getStorePeriod, getStoreReferrals,
  type AdminStoreFull, type AdminSub, type PlanOption, type StorePeriod, type StoreReferrals,
} from '@/services/admin/storesService';
import { Badge, CARD, brl, dt, mb, modLabel } from '@/components/admin/storeUi';
import { ChangePlanModal, NewSubscriptionModal } from '@/components/admin/StoreModals';

const TH = 'px-3 py-2 text-xs uppercase tracking-wider text-slate-500';
const BTN = 'rounded-lg px-3 py-1.5 text-[13px] font-bold disabled:opacity-40';
const SEL = 'rounded-lg border border-white/10 bg-[#0b0f1c] px-3 py-1.5 text-[13px] text-white outline-none focus:border-[#fd8539]';
const SUB_LABEL: Record<string, string> = {
  active: 'Ativa', trialing: 'Trial', past_due: 'Em atraso', canceled: 'Cancelada', lifetime: 'Vitalícia', incomplete: 'Incompleta',
};
const CYCLE_LABEL: Record<string, string> = { monthly: 'Mensal', semiannual: 'Semestral', yearly: 'Anual' };
const RES_PERIODS = [['7', 'Últimos 7 dias'], ['30', 'Últimos 30 dias'], ['90', 'Últimos 90 dias'], ['365', 'Último ano'], ['all', 'Todo o período']] as const;
const FIN_PERIODS = [['30', '30 dias'], ['90', '90 dias'], ['all', 'Todos']] as const;
const CLOSED = ['paid', 'canceled', 'cancelled', 'void', 'refunded'];
const subModule = (s: AdminSub) => (s.module_key && s.module_key !== 'bundle' ? modLabel(s.module_key) : 'Combo');
const num = (n: number) => n.toLocaleString('pt-BR');

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={CARD}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
    </div>
  );
}

function PeriodSelect({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: readonly (readonly [string, string])[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={SEL}>
      {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
    </select>
  );
}

function usePeriod(storeId: string, sel: string) {
  const [per, setPer] = useState<StorePeriod | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    getStorePeriod(storeId, sel === 'all' ? null : Number(sel))
      .then((r) => { if (alive) setPer(r); })
      .catch((e: any) => { if (alive) toast.error(e?.message || 'Erro ao carregar o período.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [storeId, sel]);
  return { per, loading };
}

export function ResumoTab({ storeId, data }: { storeId: string; data: AdminStoreFull }) {
  const [sel, setSel] = useState('30');
  const { per, loading } = usePeriod(storeId, sel);
  const s = data.store;
  const ev = per?.events || {};
  const views = ev.video_view || 0;
  const clicks = (ev.product_click || 0) + (ev.whatsapp_click || 0);
  const total = Object.values(ev).reduce((a, b) => a + (Number(b) || 0), 0);
  const storage = s.storage_limit_bytes ? `${mb(s.storage_used_bytes)} de ${mb(s.storage_limit_bytes)}` : mb(s.storage_used_bytes);
  return (
    <div className={`space-y-4 ${loading ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-slate-500">Último evento do widget: {data.last_event_at ? new Date(data.last_event_at).toLocaleString('pt-BR') : '—'}</p>
        <PeriodSelect value={sel} onChange={setSel} options={RES_PERIODS} />
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Pago ao SLL" value={brl(per?.paid_cents || 0)} hint={`${per?.paid_count || 0} fatura(s) paga(s) · acumulado`} />
        <Kpi label="Em aberto" value={brl(data.open_cents)} hint={s.past_due_since ? `Atraso desde ${dt(s.past_due_since)}` : 'Sem atraso'} />
        <Kpi label="Views" value={num(views)} />
        <Kpi label="Cliques" value={num(clicks)} hint={views ? `CTR ${((clicks / views) * 100).toFixed(1).replace('.', ',')}%` : 'Sem views'} />
        <Kpi label="Eventos" value={num(total)} />
        <Kpi label="Armazenamento" value={storage} hint="uso atual (sem histórico)" />
        <Kpi label="Vídeos" value={String(data.videos_count)} hint="total na loja" />
        {(s as any).plan_kind === 'lifetime'
          ? <Kpi label="Plano" value="Vitalício" />
          : (s as any).plan_kind === 'paid'
            ? <Kpi label="Plano" value="Assinatura ativa" />
            : <Kpi label="Trial até" value={dt(s.trial_ends_at)} />}
      </div>
      <div className={CARD}>
        <p className="mb-3 text-[15px] font-bold text-white">Eventos por tipo</p>
        <div className="flex flex-wrap gap-2">
          {Object.keys(ev).length === 0 && <span className="text-[13px] text-slate-500">Nenhum evento no período.</span>}
          {Object.entries(ev).map(([k, v]) => (
            <span key={k} className="rounded-md bg-white/5 px-2 py-1 text-[13px] text-slate-300">{k}: <strong>{v}</strong></span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AssinaturasTab({ storeId, data, plans, busy, onStatus, reload }: {
  storeId: string; data: AdminStoreFull; plans: PlanOption[]; busy: boolean;
  onStatus: (id: string, to: 'active' | 'canceled' | 'lifetime', hasAsaas: boolean) => void;
  reload: () => Promise<void>;
}) {
  const [work, setWork] = useState(false);
  const [menu, setMenu] = useState<{ sub: AdminSub; top: number; right: number } | null>(null);
  const [change, setChange] = useState<AdminSub | null>(null);
  const [adding, setAdding] = useState(false);
  const atuais = data.subscriptions.filter((x) => x.is_current);
  const historico = data.subscriptions.filter((x) => !x.is_current);

  const act = async (fn: () => Promise<unknown>, ok: string, done: () => void) => {
    setWork(true);
    try { await fn(); toast.success(ok); done(); await reload(); }
    catch (e: any) { toast.error(e?.message || 'Erro ao executar.'); }
    finally { setWork(false); }
  };

  const pick = (to: 'active' | 'canceled' | 'lifetime') => {
    if (!menu) return;
    const { sub } = menu;
    setMenu(null);
    onStatus(sub.id, to, sub.has_asaas);
  };
  const item = 'block w-full px-3 py-2 text-left text-[13px] hover:bg-white/10';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[15px] font-bold text-white">Assinaturas atuais ({atuais.length})</p>
          <button type="button" onClick={() => setAdding(true)} className={`${BTN} flex items-center gap-1.5 bg-[#fd8539] text-white`}><Plus size={14} /> Nova assinatura / Ativar módulo</button>
        </div>
        <div className={`${CARD} overflow-x-auto p-0`}>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>Módulo</th><th className={TH}>Plano</th><th className={TH}>Status</th>
                <th className={TH}>Ciclo</th><th className={TH}>Criada em</th><th className={TH}>Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {atuais.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhuma assinatura atual.</td></tr>}
              {atuais.map((sub) => (
                <tr key={sub.id}>
                  <td className="px-3 py-3 font-bold text-white">{subModule(sub)}</td>
                  <td className="px-3 py-3 text-slate-300">{sub.plan_name || '—'}</td>
                  <td className="px-3 py-3 text-slate-300">{SUB_LABEL[sub.status] || sub.status}</td>
                  <td className="px-3 py-3 text-slate-400">{sub.status === 'lifetime' ? 'Vitalício' : (CYCLE_LABEL[sub.billing_cycle || ''] || sub.billing_cycle || '—')}</td>
                  <td className="px-3 py-3 text-slate-400">{dt(sub.created_at)}</td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      disabled={busy || work}
                      onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ sub, top: r.bottom + 4, right: window.innerWidth - r.right }); }}
                      className={`${BTN} flex items-center gap-1 bg-white/10 text-slate-200`}
                    >
                      Ações <ChevronDown size={12} />
                    </button>
                    {sub.has_asaas && <p className="mt-1 text-xs text-amber-400">Cobrança ativa no Asaas</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[15px] font-bold text-slate-400">Histórico ({historico.length})</p>
        <div className={`${CARD} overflow-x-auto p-0`}>
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-white/10">
                <th className={TH}>Módulo</th><th className={TH}>Plano</th><th className={TH}>Status</th><th className={TH}>Ciclo</th><th className={TH}>Criada em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {historico.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Sem histórico.</td></tr>}
              {historico.map((sub) => (
                <tr key={sub.id} className="opacity-60">
                  <td className="px-3 py-2 font-bold text-white">{subModule(sub)}</td>
                  <td className="px-3 py-2 text-slate-300">{sub.plan_name || '—'}</td>
                  <td className="px-3 py-2 text-slate-300">{SUB_LABEL[sub.status] || sub.status}</td>
                  <td className="px-3 py-2 text-slate-400">{sub.status === 'lifetime' ? 'Vitalício' : (CYCLE_LABEL[sub.billing_cycle || ''] || sub.billing_cycle || '—')}</td>
                  <td className="px-3 py-2 text-slate-400">{dt(sub.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menu && (
        <>
          <div className="fixed inset-0 z-[55]" onClick={() => setMenu(null)} />
          <div className="fixed z-[56] w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0b0f1c] py-1 shadow-xl" style={{ top: menu.top, right: menu.right }}>
            <button type="button" className={`${item} text-white`} onClick={() => { setChange(menu.sub); setMenu(null); }}>Alterar plano</button>
            {menu.sub.status !== 'canceled' && <button type="button" className={`${item} text-amber-300`} onClick={() => pick('canceled')}>Cancelar</button>}
            {menu.sub.status !== 'active' && <button type="button" className={`${item} text-emerald-300`} onClick={() => pick('active')}>Ativar</button>}
            {menu.sub.status !== 'lifetime' && <button type="button" className={`${item} text-sky-300`} onClick={() => pick('lifetime')}>Tornar vitalícia</button>}
          </div>
        </>
      )}
      {change && (
        <ChangePlanModal sub={change} plans={plans} busy={work} onClose={() => setChange(null)}
          onConfirm={(planId) => act(() => changePlan(change.id, planId), 'Plano alterado.', () => setChange(null))} />
      )}
      {adding && (
        <NewSubscriptionModal plans={plans} busy={work} onClose={() => setAdding(false)}
          onCreate={(m, p, c, st) => act(() => createSubscription(storeId, p, m, c, st), 'Assinatura criada.', () => setAdding(false))} />
      )}
    </div>
  );
}

function invState(i: StorePeriod['invoices'][number]): { label: string; cls: string } {
  if (i.status === 'paid') return { label: 'Paga', cls: 'bg-emerald-500/15 text-emerald-300' };
  if (CLOSED.includes(i.status)) return { label: i.status, cls: 'bg-slate-500/15 text-slate-300' };
  const late = i.status === 'overdue' || (!!i.due_date && new Date(`${i.due_date.slice(0, 10)}T23:59:59`).getTime() < Date.now());
  return late ? { label: 'Vencida', cls: 'bg-rose-500/15 text-rose-300' } : { label: 'Aberta', cls: 'bg-amber-500/15 text-amber-300' };
}

export function FinanceiroTab({ storeId }: { storeId: string }) {
  const [sel, setSel] = useState('30');
  const { per, loading } = usePeriod(storeId, sel);
  const list = per?.invoices || [];
  const paidPeriod = list.filter((i) => i.status === 'paid').reduce((a, i) => a + (i.amount_cents || 0), 0);
  const openPeriod = list.filter((i) => !CLOSED.includes(i.status)).reduce((a, i) => a + (i.amount_cents || 0), 0);
  return (
    <div className={`space-y-4 ${loading ? 'opacity-60' : ''}`}>
      <div className="flex justify-end"><PeriodSelect value={sel} onChange={setSel} options={FIN_PERIODS} /></div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Kpi label="Total pago (acumulado)" value={brl(per?.paid_cents || 0)} hint={`${per?.paid_count || 0} fatura(s) paga(s)`} />
        <Kpi label="Pago no período" value={brl(paidPeriod)} />
        <Kpi label="Em aberto no período" value={brl(openPeriod)} />
        <Kpi label="Faturas no período" value={String(list.length)} />
      </div>
      <div className={`${CARD} overflow-x-auto p-0`}>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className={TH}>Data</th><th className={TH}>Descrição</th><th className={TH}>Valor</th>
              <th className={TH}>Status</th><th className={TH}>Vencimento</th><th className={TH}>Pago em</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Sem faturas no período.</td></tr>}
            {list.map((i) => {
              const st = invState(i);
              return (
                <tr key={i.id}>
                  <td className="px-3 py-2 text-slate-400">{dt(i.created_at)}</td>
                  <td className="px-3 py-2 text-slate-300">{i.description || '—'}</td>
                  <td className="px-3 py-2 font-bold text-white">{brl(i.amount_cents)}</td>
                  <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-[13px] font-bold ${st.cls}`}>{st.label}</span></td>
                  <td className="px-3 py-2 text-slate-400">{dt(i.due_date)}</td>
                  <td className="px-3 py-2 text-slate-400">{dt(i.paid_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function IndicacoesTab({ storeId }: { storeId: string }) {
  const [, setParams] = useSearchParams();
  const [d, setD] = useState<StoreReferrals | null>(null);
  useEffect(() => {
    let alive = true;
    getStoreReferrals(storeId)
      .then((r) => { if (alive) setD(r); })
      .catch((e: any) => { if (alive) toast.error(e?.message || 'Erro ao carregar as indicações.'); });
    return () => { alive = false; };
  }, [storeId]);
  const list = d?.list || [];
  const commission = list.reduce((a, r) => a + (Number(r.commission) || 0), 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Kpi label="Lojas indicadas" value={String(list.length)} />
        <Kpi label="Comissão acumulada" value={commission.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
        <Kpi label="Indicada por" value={d?.referred_by?.name || 'Cadastro Direto / Orgânico'} />
      </div>
      <div className={`${CARD} overflow-x-auto p-0`}>
        <table className="w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-white/10">
              <th className={TH}>Loja</th><th className={TH}>Plano</th><th className={TH}>Status</th>
              <th className={TH}>Data Cadastro</th><th className={TH}>Comissão Gerada</th><th className={TH}>Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {list.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhuma indicação.</td></tr>}
            {list.map((r) => (
              <tr key={r.id}>
                <td className="px-3 py-2 font-bold text-white">{r.name || 'Sem nome'}</td>
                <td className="px-3 py-2 text-slate-300">{r.plan_name || '—'}</td>
                <td className="px-3 py-2"><Badge status={r.status} /></td>
                <td className="px-3 py-2 text-slate-400">{dt(r.created_at)}</td>
                <td className="px-3 py-2 text-slate-300">{brl(Math.round((Number(r.commission) || 0) * 100))}</td>
                <td className="px-3 py-2">
                  <button type="button" onClick={() => setParams({ tab: 'lojas', loja: r.id })} className={`${BTN} bg-white/10 text-slate-200 hover:bg-white/20`}>Ver Loja</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}