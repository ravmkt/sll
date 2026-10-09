import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  addBenefit, cancelSubscription, changePlan, deleteStore, getStoreFull, listPlans, setSubscriptionStatus, updateStore,
  type AdminStoreFull, type PlanOption, type StoreStatus,
} from '@/services/admin/storesService';
import { Badge, CARD, ContactButtons, DeleteStoreModal, ICON, INPUT, brl, dt, dtt, mb, modLabel } from '@/components/admin/storeUi';

const TABS = [
  ['resumo', 'Resumo'], ['assinaturas', 'Assinaturas'], ['financeiro', 'Financeiro'], ['indicacoes', 'Indicações'],
  ['beneficios', 'Benefícios'], ['dados', 'Dados'], ['log', 'Log'],
] as const;

const SUB_LABEL: Record<string, string> = {
  active: 'Ativa', trialing: 'Trial', past_due: 'Em atraso', canceled: 'Cancelada', lifetime: 'Vitalícia', incomplete: 'Incompleta',
};
const ACTION_LABEL: Record<string, string> = {
  store_updated: 'Dados da loja editados',
  store_deleted: 'Loja excluída',
  subscription_plan_changed: 'Plano alterado',
  subscription_status_changed: 'Status da assinatura alterado',
  benefit_applied: 'Benefício aplicado',
};
const EVENT_LABEL: Record<string, string> = {
  video_view: 'Vídeo assistido', story_open: 'Story aberto', story_complete: 'Story concluído',
  video_close: 'Vídeo fechado', next_video: 'Passou para o próximo vídeo', progress: 'Progresso de reprodução',
  product_view: 'Produto visualizado', product_click: 'Clique em produto', whatsapp_click: 'Clique no WhatsApp',
  share: 'Compartilhamento', comment: 'Comentário', like: 'Curtida', unlike: 'Curtida removida',
};
const friendlyEvent = (t: string) => EVENT_LABEL[t] || t;

const diasTxt = (n: number) => `${n} ${n === 1 ? 'dia' : 'dias'}`;

function friendlyAudit(
  action: string,
  details: Record<string, unknown> | null,
  planNames: Record<string, string>,
): { title: string; text: string } {
  const d: any = details || {};
  const mod = d.module_key ? modLabel(String(d.module_key)) : 'Módulo';
  const note = d.note ? ` Motivo: ${d.note}.` : '';
  switch (action) {
    case 'module_enabled': {
      const days = Number(d.days);
      return { title: 'Módulo ativado', text: days > 0 ? `${mod} liberado por ${diasTxt(days)}.` : `${mod} ativado.` };
    }
    case 'module_disabled':
      return { title: 'Módulo desativado', text: `${mod} desativado.` };
    case 'benefit_applied': {
      if (d.kind === 'trial_days') return { title: 'Trial estendido', text: `+${diasTxt(Number(d.value) || 0)} de trial para a loja (vale para a loja toda).${note}` };
      if (d.kind === 'discount_percent') return { title: 'Desconto registrado', text: `Desconto de ${d.value}% registrado.${note}` };
      if (d.kind === 'coupon') return { title: 'Cupom registrado', text: `Cupom "${d.value}" registrado.${note}` };
      return { title: 'Benefício aplicado', text: note.trim() };
    }
    case 'subscription_plan_changed':
      return { title: 'Plano alterado', text: `Plano trocado para ${planNames[String(d.plan_id)] || 'outro plano'}.` };
    case 'subscription_status_changed': {
      const st = String(d.status || d.new_status || d.p_status || '');
      const map: Record<string, string> = { active: 'ativada', canceled: 'cancelada', lifetime: 'marcada como vitalícia' };
      return { title: 'Assinatura alterada', text: map[st] ? `Assinatura ${map[st]}.` : 'Status da assinatura alterado.' };
    }
    case 'store_updated':
      return { title: 'Dados editados', text: 'Dados cadastrais da loja salvos.' };
    case 'store_deleted':
      return { title: 'Loja excluída', text: `Loja "${d.name || ''}" excluída.` };
    default: {
      const h = action.replace(/_/g, ' ');
      return { title: h.charAt(0).toUpperCase() + h.slice(1), text: '' };
    }
  }
}
const FIELDS: [string, string][] = [
  ['name', 'Nome da loja'], ['url', 'URL da loja'], ['platform', 'Plataforma'], ['contact_name', 'Nome do contato'],
  ['contact_email', 'E-mail de contato'], ['owner_contact_email', 'E-mail do assinante'], ['whatsapp', 'WhatsApp (com DDD)'],
];
const TH = 'px-3 py-2 text-[10px] uppercase tracking-wider text-slate-500';
const BTN = 'rounded-lg px-3 py-1.5 text-[11px] font-bold disabled:opacity-40';

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className={CARD}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

export default function StoreDetailPage({ storeId }: { storeId: string }) {
  const [params, setParams] = useSearchParams();
  const aba = params.get('aba') || 'resumo';

  const [data, setData] = useState<AdminStoreFull | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [ben, setBen] = useState({ kind: 'trial_days', value: '', note: '' });
  const [planSel, setPlanSel] = useState<Record<string, string>>({});
  const [logFilter, setLogFilter] = useState<'all' | 'painel' | 'evento'>('all');
  const [showCode, setShowCode] = useState(false);

  const load = useCallback(async (first = false) => {
    if (first) setLoading(true);
    try {
      const d = await getStoreFull(storeId);
      setData(d);
      const s: any = d?.store || {};
      setForm({
        name: s.name || '', url: s.url || '', platform: s.platform || '', contact_name: s.contact_name || '',
        contact_email: s.contact_email || '', owner_contact_email: s.owner_contact_email || '', whatsapp: s.whatsapp || '',
      });
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao carregar a loja.');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { load(true); }, [load]);
  useEffect(() => { listPlans().then(setPlans).catch(() => setPlans([])); }, []);

  const status: StoreStatus = useMemo(() => {
    const cur = (data?.subscriptions || []).filter((s) => s.is_current);
    if (cur.some((s) => s.status === 'past_due')) return 'past_due';
    if (cur.some((s) => s.status === 'active' || s.status === 'lifetime')) return 'active';
    if (cur.some((s) => s.status === 'trialing')) return 'trial';
    return 'inactive';
  }, [data]);

  const logRows = useMemo(() => {
    if (!data) return [];
    const planNames: Record<string, string> = Object.fromEntries(plans.map((p) => [p.id, p.name || '']));
    const a = data.audit.map((x) => ({
      at: x.created_at, src: 'painel' as const, title: friendlyAudit(x.action, x.details, planNames).title,
      text: friendlyAudit(x.action, x.details, planNames).text, detail: x.details ? JSON.stringify(x.details) : '',
    }));
    const e = data.recent_events.map((x) => ({
      at: x.created_at, src: 'evento' as const, title: friendlyEvent(x.event_type), text: x.page_path ? `Na página ${x.page_path}` : '', detail: `${x.event_type}${x.page_path ? ' · ' + x.page_path : ''}`,
    }));
    return [...a, ...e]
      .filter((r) => logFilter === 'all' || r.src === logFilter)
      .sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime());
  }, [data, logFilter, plans]);

  const back = () => setParams({ tab: 'lojas' });
  const setAba = (a: string) => setParams({ tab: 'lojas', loja: storeId, aba: a });

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); await load(); }
    catch (e: any) { toast.error(e?.message || 'Erro ao executar.'); }
    finally { setBusy(false); }
  };

  const changeStatus = (id: string, to: 'active' | 'canceled' | 'lifetime', hasAsaas: boolean) => {
    const label = to === 'canceled' ? 'Cancelar' : to === 'active' ? 'Ativar' : 'Tornar vitalícia';
    const aviso = !hasAsaas ? '' : to === 'canceled'
      ? '\nA cobrança também será cancelada no Asaas.'
      : '\nHá cobrança no Asaas: isso não altera o Asaas.';
    if (!window.confirm(`${label} esta assinatura?${aviso}`)) return;
    run(() => (to === 'canceled' ? cancelSubscription(id) : setSubscriptionStatus(id, to)), 'Assinatura atualizada.');
  };

  const confirmDelete = async () => {
    setBusy(true);
    try {
      await deleteStore(storeId);
      toast.success('Loja excluída.');
      back();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível excluir a loja.');
      setBusy(false);
    }
  };

  const submitBenefit = () => {
    if (!ben.value.trim()) { toast.error('Informe o valor do benefício.'); return; }
    run(async () => {
      await addBenefit(storeId, ben.kind, ben.value.trim(), ben.note);
      setBen({ kind: ben.kind, value: '', note: '' });
    }, 'Benefício aplicado.');
  };

  if (loading) return <div className="flex h-60 items-center justify-center"><Loader2 className={`h-6 w-6 animate-spin ${ICON}`} /></div>;
  if (!data?.store) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={back} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white"><ArrowLeft size={16} /> Voltar para Lojas</button>
        <p className="text-sm text-slate-400">Loja não encontrada.</p>
      </div>
    );
  }

  const s = data.store;
  const ev30 = data.events_30d || {};
  const views30 = ev30.video_view || 0;
  const clicks30 = (ev30.product_click || 0) + (ev30.whatsapp_click || 0);
  const storageLabel = s.storage_limit_bytes ? `${mb(s.storage_used_bytes)} de ${mb(s.storage_limit_bytes)}` : mb(s.storage_used_bytes);
  const contactEmail = s.owner_contact_email || s.owner_email || s.contact_email;

  return (
    <div className="space-y-5">
      <button type="button" onClick={back} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Voltar para Lojas
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-white">{s.name || 'Sem nome'}</h1>
            <Badge status={status} />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {s.url || 'sem URL'} · criada em {dt(s.created_at)} · login: {s.owner_email || '—'} · último acesso: {dtt(s.last_sign_in_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContactButtons whatsapp={s.whatsapp} email={contactEmail} size={18} />
          <button type="button" onClick={() => setShowDel(true)} className={`${BTN} flex items-center gap-2 bg-rose-500/15 text-rose-300 hover:bg-rose-500/25`}>
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b border-white/10">
        {TABS.map(([k, l]) => (
          <button
            key={k}
            type="button"
            onClick={() => setAba(k)}
            className={`border-b-2 px-4 py-2 text-xs font-bold transition-colors ${aba === k ? 'border-[#fd8539] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {aba === 'resumo' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <Kpi label="Pago ao SLL" value={brl(data.paid_cents)} hint={`${data.paid_count} fatura(s) paga(s)`} />
            <Kpi label="Em aberto" value={brl(data.open_cents)} hint={s.past_due_since ? `Atraso desde ${dt(s.past_due_since)}` : 'Sem atraso'} />
            <Kpi label="Views (30 dias)" value={views30.toLocaleString('pt-BR')} hint={`${(data.events_total.video_view || 0).toLocaleString('pt-BR')} no total`} />
            <Kpi label="Cliques (30 dias)" value={clicks30.toLocaleString('pt-BR')} hint={views30 ? `CTR ${((clicks30 / views30) * 100).toFixed(1).replace('.', ',')}%` : 'Sem views'} />
            <Kpi label="Vídeos" value={String(data.videos_count)} />
            <Kpi label="Armazenamento" value={storageLabel} />
            <Kpi label="Indicadas" value={String(data.referrals.made_count)} hint={`Comissão: ${data.referrals.commission_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`} />
            <Kpi label="Trial até" value={dt(s.trial_ends_at)} />
          </div>
          <div className={CARD}>
            <p className="mb-2 text-sm font-bold text-white">Eventos nos últimos 30 dias</p>
            <p className="mb-3 text-[11px] text-slate-500">Último evento do widget: {dtt(data.last_event_at)}</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(ev30).length === 0 && <span className="text-xs text-slate-500">Nenhum evento no período.</span>}
              {Object.entries(ev30).map(([k, v]) => (
                <span key={k} className="rounded-md bg-white/5 px-2 py-1 text-[11px] text-slate-300">{k}: <strong>{v}</strong></span>
              ))}
            </div>
          </div>
        </div>
      )}

      {aba === 'assinaturas' && (() => {
        const atuais = data.subscriptions.filter((x) => x.is_current);
        const historico = data.subscriptions.filter((x) => !x.is_current);
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <p className="text-sm font-bold text-white">Assinaturas atuais ({atuais.length})</p>
              <div className={`${CARD} overflow-x-auto p-0`}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className={TH}>Módulo</th><th className={TH}>Plano</th><th className={TH}>Status</th>
                      <th className={TH}>Ciclo</th><th className={TH}>Criada em</th><th className={TH}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {atuais.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Nenhuma assinatura atual.</td></tr>}
                    {atuais.map((sub) => {
                      const sel = planSel[sub.id] ?? '';
                      return (
                        <tr key={sub.id}>
                          <td className="px-3 py-3 font-bold text-white">{sub.module_key ? modLabel(sub.module_key) : 'Combo'}</td>
                          <td className="px-3 py-3">
                            <p className="mb-1 text-slate-300">{sub.plan_name || '—'}</p>
                            <div className="flex gap-2">
                              <select value={sel} onChange={(e) => setPlanSel({ ...planSel, [sub.id]: e.target.value })} className={`${INPUT} !w-44`}>
                                <option value="">Trocar para…</option>
                                {plans.filter((p) => !p.module_key || !sub.module_key || p.module_key === sub.module_key).map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </select>
                              <button type="button" disabled={busy || !sel} onClick={() => run(() => changePlan(sub.id, sel), 'Plano alterado.')} className={`${BTN} bg-[#fd8539] text-white`}>Salvar</button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-slate-300">{SUB_LABEL[sub.status] || sub.status}</td>
                          <td className="px-3 py-3 text-slate-400">{sub.billing_cycle || '—'}</td>
                          <td className="px-3 py-3 text-slate-400">{dt(sub.created_at)}</td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-1.5">
                              {sub.status !== 'canceled' && <button type="button" disabled={busy} onClick={() => changeStatus(sub.id, 'canceled', sub.has_asaas)} className={`${BTN} bg-amber-500/15 text-amber-300`}>Cancelar</button>}
                              {sub.status !== 'active' && <button type="button" disabled={busy} onClick={() => changeStatus(sub.id, 'active', sub.has_asaas)} className={`${BTN} bg-emerald-500/15 text-emerald-300`}>Ativar</button>}
                              {sub.status !== 'lifetime' && <button type="button" disabled={busy} onClick={() => changeStatus(sub.id, 'lifetime', sub.has_asaas)} className={`${BTN} bg-sky-500/15 text-sky-300`}>Vitalício</button>}
                            </div>
                            {sub.has_asaas && <p className="mt-1 text-[10px] text-amber-400">Cobrança ativa no Asaas</p>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-bold text-slate-400">Histórico ({historico.length})</p>
              <div className={`${CARD} overflow-x-auto p-0`}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className={TH}>Módulo</th><th className={TH}>Plano</th><th className={TH}>Status</th>
                      <th className={TH}>Ciclo</th><th className={TH}>Criada em</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {historico.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-500">Sem histórico.</td></tr>}
                    {historico.map((sub) => (
                      <tr key={sub.id} className="opacity-60">
                        <td className="px-3 py-2 font-bold text-white">{sub.module_key ? modLabel(sub.module_key) : 'Combo'}</td>
                        <td className="px-3 py-2 text-slate-300">{sub.plan_name || '—'}</td>
                        <td className="px-3 py-2 text-slate-300">{SUB_LABEL[sub.status] || sub.status}</td>
                        <td className="px-3 py-2 text-slate-400">{sub.billing_cycle || '—'}</td>
                        <td className="px-3 py-2 text-slate-400">{dt(sub.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}
      {aba === 'financeiro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <Kpi label="Total pago" value={brl(data.paid_cents)} />
            <Kpi label="Em aberto" value={brl(data.open_cents)} />
            <Kpi label="Faturas pagas" value={String(data.paid_count)} />
          </div>
          <div className={`${CARD} overflow-x-auto p-0`}>
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10">
                  <th className={TH}>Criada</th><th className={TH}>Descrição</th><th className={TH}>Valor</th>
                  <th className={TH}>Status</th><th className={TH}>Vencimento</th><th className={TH}>Pago em</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.invoices.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">Sem faturas.</td></tr>}
                {data.invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="px-3 py-2 text-slate-400">{dt(i.created_at)}</td>
                    <td className="px-3 py-2 text-slate-300">{i.description || '—'}</td>
                    <td className="px-3 py-2 font-bold text-white">{brl(i.amount_cents)}</td>
                    <td className="px-3 py-2 text-slate-300">{i.status}</td>
                    <td className="px-3 py-2 text-slate-400">{dt(i.due_date)}</td>
                    <td className="px-3 py-2 text-slate-400">{dt(i.paid_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'indicacoes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            <Kpi label="Lojas indicadas" value={String(data.referrals.made_count)} />
            <Kpi label="Comissão acumulada" value={data.referrals.commission_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} />
            <Kpi label="Indicada por" value={s.referred_by_name || '—'} />
          </div>
          <div className={`${CARD} overflow-x-auto p-0`}>
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-white/10"><th className={TH}>Loja indicada</th><th className={TH}>Cadastro</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {data.referrals.list.length === 0 && <tr><td colSpan={2} className="px-4 py-8 text-center text-slate-500">Nenhuma indicação.</td></tr>}
                {data.referrals.list.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 font-bold text-white">{r.name || 'Sem nome'}</td>
                    <td className="px-3 py-2 text-slate-400">{dt(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'beneficios' && (
        <div className="space-y-4">
          <div className={`${CARD} space-y-3`}>
            <p className="text-sm font-bold text-white">Aplicar benefício</p>
            <div className="grid gap-2 md:grid-cols-4">
              <select value={ben.kind} onChange={(e) => setBen({ ...ben, kind: e.target.value, value: '' })} className={INPUT}>
                <option value="trial_days">Dias extras de trial</option>
                <option value="discount_percent">Desconto (%)</option>
                <option value="coupon">Cupom</option>
              </select>
              <input
                value={ben.value}
                onChange={(e) => setBen({ ...ben, value: e.target.value })}
                placeholder={ben.kind === 'coupon' ? 'Código do cupom' : ben.kind === 'trial_days' ? 'Dias (1 a 365)' : 'Percentual (1 a 100)'}
                className={INPUT}
              />
              <input value={ben.note} onChange={(e) => setBen({ ...ben, note: e.target.value })} placeholder="Observação (opcional)" className={INPUT} />
              <button type="button" disabled={busy} onClick={submitBenefit} className={`${BTN} bg-[#fd8539] text-white`}>Aplicar</button>
            </div>
            <p className="text-[11px] text-slate-500">Dias de trial valem na hora. Desconto e cupom ficam registrados na loja, e o checkout ainda não os aplica sozinho.</p>
          </div>
          <div className={`${CARD} overflow-x-auto p-0`}>
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-white/10"><th className={TH}>Data</th><th className={TH}>Tipo</th><th className={TH}>Valor</th><th className={TH}>Observação</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {data.benefits.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Nenhum benefício aplicado.</td></tr>}
                {data.benefits.map((b) => (
                  <tr key={b.id}>
                    <td className="px-3 py-2 text-slate-400">{dtt(b.created_at)}</td>
                    <td className="px-3 py-2 text-slate-300">{b.kind === 'trial_days' ? 'Dias de trial' : b.kind === 'discount_percent' ? 'Desconto %' : 'Cupom'}</td>
                    <td className="px-3 py-2 font-bold text-white">{b.value}</td>
                    <td className="px-3 py-2 text-slate-400">{b.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {aba === 'dados' && (
        <div className={`${CARD} max-w-2xl space-y-3`}>
          {FIELDS.map(([k, l]) => (
            <label key={k} className="block space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{l}</span>
              <input value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={INPUT} />
            </label>
          ))}
          <button
            type="button"
            disabled={busy || !(form.name || '').trim()}
            onClick={() => run(() => updateStore(storeId, form), 'Dados salvos.')}
            className={`${BTN} bg-[#fd8539] text-white`}
          >
            {busy ? 'Salvando…' : 'Salvar dados'}
          </button>
        </div>
      )}

      {aba === 'log' && (
        <div className="space-y-3">
          <div className="flex gap-2">
            {([['all', 'Tudo'], ['painel', 'Ações do painel'], ['evento', 'Eventos do widget']] as const).map(([k, l]) => (
              <button
                key={k}
                type="button"
                onClick={() => setLogFilter(k)}
                className={`rounded-full border px-3 py-1 text-xs font-bold ${logFilter === k ? 'border-[#fd8539] bg-[#fd8539]/15 text-white' : 'border-white/10 text-slate-400'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className={`${CARD} overflow-x-auto p-0`}>
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-white/10"><th className={TH}>Quando</th><th className={TH}>Origem</th><th className={TH}>O que</th><th className={TH}><label className="flex cursor-pointer items-center gap-2 normal-case tracking-normal"><input type="checkbox" checked={showCode} onChange={(e) => setShowCode(e.target.checked)} /> Detalhe · mostrar código técnico</label></th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {logRows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Sem registros.</td></tr>}
                {logRows.map((r, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">{dtt(r.at)}</td>
                    <td className="px-3 py-2 text-slate-300">{r.src === 'painel' ? 'Painel' : 'Widget'}</td>
                    <td className="px-3 py-2 font-bold text-white">{r.title}</td>
                    <td className="max-w-lg px-3 py-2 text-slate-300" title={r.detail}>{r.text || '—'}{showCode && r.detail && <span className="mt-1 block break-all font-mono text-[10px] text-slate-600">{r.detail}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showDel && <DeleteStoreModal name={s.name || 'excluir'} busy={busy} onCancel={() => setShowDel(false)} onConfirm={confirmDelete} />}
    </div>
  );
}