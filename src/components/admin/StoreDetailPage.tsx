import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Loader2, Trash2 } from 'lucide-react';
import { CancelSubscriptionModal } from '@/components/admin/StoreModals';
import { toast } from 'sonner';
import {
  addBenefit, cancelSubscription, deleteStore, getStoreFull, listPlans, setSubscriptionStatus, updateStore,
  type AdminStoreFull, type PlanOption, type StoreStatus,
} from '@/services/admin/storesService';
import { Badge, CARD, DeleteStoreModal, ICON, INPUT, dt, dtt, modLabel } from '@/components/admin/storeUi';
import { ContactActions } from '@/components/admin/StoreModals';
import { CommunicationTab } from '@/components/admin/CommunicationTab';
import { AssinaturasTab, FinanceiroTab, IndicacoesTab, ResumoTab } from '@/components/admin/storeTabs';

const TABS = [
  ['resumo', 'Resumo'], ['assinaturas', 'Assinaturas'], ['financeiro', 'Financeiro'], ['indicacoes', 'Indicações'],
  ['beneficios', 'Benefícios'], ['comunicacao', 'Comunicação'], ['dados', 'Dados'], ['log', 'Log'],
] as const;

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
    case 'subscription_created':
      return { title: 'Assinatura criada', text: 'Módulo adicionado manualmente pelo Master.' };
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
const PLATFORMS = ['Nuvemshop', 'Shopify', 'Yampi', 'Tray', 'WooCommerce', 'Vtex', 'Loja Física/Outra'];
const canonPlatform = (v: string) => PLATFORMS.find((p) => p.toLowerCase() === (v || '').trim().toLowerCase()) ?? (v || '');
const onlyDigits = (v: string) => (v || '').replace(/\D/g, '');
// Mostra no formato (41) 99999-9999; ignora o 55 do país quando vier gravado
const maskBr = (v: string) => {
  let d = onlyDigits(v);
  if (d.length > 11 && d.startsWith('55')) d = d.slice(2);
  d = d.slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};

const FIELDS: [string, string][] = [
  ['name', 'Nome da loja'], ['url', 'URL da loja'], ['platform', 'Plataforma'], ['contact_name', 'Nome do contato'],
  ['contact_email', 'E-mail de contato'], ['owner_contact_email', 'E-mail do assinante'], ['whatsapp', 'WhatsApp (com DDD)'],
];
const TH = 'px-3 py-2 text-xs uppercase tracking-wider text-slate-500';
const BTN = 'rounded-lg px-3 py-1.5 text-[13px] font-bold disabled:opacity-40';


function IdChip({ id }: { id: string }) {
  const [ok, setOk] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(id);
      setOk(true);
      toast.success('ID da loja copiado.');
      setTimeout(() => setOk(false), 1500);
    } catch {
      toast.error('Não foi possível copiar o ID.');
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      title="Copiar ID da loja"
      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2 py-1 font-mono text-[13px] text-slate-300 hover:bg-white/10"
    >
      <span>{id}</span>
      {ok ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} className={ICON} />}
    </button>
  );
}

export default function StoreDetailPage({ storeId }: { storeId: string }) {
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const aba = params.get('aba') || 'resumo';

  const [data, setData] = useState<AdminStoreFull | null>(null);
  const [plans, setPlans] = useState<PlanOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showDel, setShowDel] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [benMonths, setBenMonths] = useState('');
  const [ben, setBen] = useState({ kind: 'trial_days', value: '', note: '' });
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
    if (to === 'canceled') { setCancelTarget(id); return; }
    run(() => setSubscriptionStatus(id, to), 'Assinatura atualizada.');
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
      await addBenefit(storeId, ben.kind, ben.value.trim(), ben.note, ben.kind === 'discount_percent' && /^\d+$/.test(benMonths.trim()) ? Number(benMonths.trim()) : null);
      setBenMonths('');
      setBen({ kind: ben.kind, value: '', note: '' });
    }, 'Benefício aplicado.');
  };

  if (loading) return <div className="flex h-60 items-center justify-center"><Loader2 className={`h-6 w-6 animate-spin ${ICON}`} /></div>;
  if (!data?.store) {
    return (
      <div className="space-y-3">
        <button type="button" onClick={back} className="flex items-center gap-2 text-[13px] font-bold text-slate-400 hover:text-white"><ArrowLeft size={16} /> Voltar para Lojas</button>
        <p className="text-[15px] text-slate-400">Loja não encontrada.</p>
      </div>
    );
  }

  const s = data.store;

  return (
    <div className="space-y-5">
      <button type="button" onClick={back} className="flex items-center gap-2 text-[13px] font-bold text-slate-400 hover:text-white">
        <ArrowLeft size={16} /> Voltar para Lojas
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-white">{s.name || 'Sem nome'}</h1>
            <Badge status={status} />
            <IdChip id={storeId} />
            {cancelTarget && (
              <CancelSubscriptionModal
                subscriptionId={cancelTarget}
                onClose={() => setCancelTarget(null)}
                onConfirm={(refund) => {
                  const id = cancelTarget;
                  setCancelTarget(null);
                  run(() => cancelSubscription(id, refund), refund ? 'Assinatura cancelada e cobrança estornada.' : 'Assinatura atualizada.');
                }}
              />
            )}
          </div>
          <p className="mt-1 text-[13px] text-slate-500">
            {s.url || 'sem URL'} · criada em {dt(s.created_at)} · login: {s.owner_email || '—'} · último acesso: {dtt(s.last_sign_in_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ContactActions storeId={storeId} storeName={s.name} contactName={s.contact_name} whatsapp={s.whatsapp} email={s.contact_email || s.owner_contact_email} />
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
            className={`border-b-2 px-4 py-2 text-[13px] font-bold transition-colors ${aba === k ? 'border-[#fd8539] text-white' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {l}
          </button>
        ))}
      </div>

      {aba === 'resumo' && <ResumoTab storeId={storeId} data={data} />}

      {aba === 'assinaturas' && <AssinaturasTab storeId={storeId} data={data} plans={plans} busy={busy} onStatus={changeStatus} reload={() => load()} />}
      {aba === 'financeiro' && <FinanceiroTab storeId={storeId} />}

      {aba === 'indicacoes' && <IndicacoesTab storeId={storeId} />}

      {aba === 'beneficios' && (
        <div className="space-y-4">
          <div className={`${CARD} space-y-3`}>
            <p className="text-[15px] font-bold text-white">Aplicar benefício</p>
            <div className="grid gap-2 md:grid-cols-4">
              <select value={ben.kind} onChange={(e) => setBen({ ...ben, kind: e.target.value, value: '' })} className={INPUT}>
                <option value="trial_days">Dias extras de trial</option>
                <option value="discount_percent">Desconto (%)</option>
                <option value="coupon">Cupom</option>
              </select>
              {ben.kind === 'discount_percent' && (
                <input
                  value={benMonths}
                  onChange={(e) => setBenMonths(e.target.value.replace(/\D/g, '').slice(0, 2))}
                  inputMode="numeric"
                  placeholder="Meses de desconto (vazio = sem prazo)"
                  className="w-full rounded-lg border border-slate-700 bg-[#0b0e1a] px-3 py-2 text-sm text-slate-100 outline-none focus:border-[#0094eb]"
                />
              )}
              <input
                value={ben.value}
                onChange={(e) => setBen({ ...ben, value: e.target.value })}
                placeholder={ben.kind === 'coupon' ? 'Código do cupom' : ben.kind === 'trial_days' ? 'Dias (1 a 365)' : 'Percentual (1 a 100)'}
                className={INPUT}
              />
              <input value={ben.note} onChange={(e) => setBen({ ...ben, note: e.target.value })} placeholder="Observação (opcional)" className={INPUT} />
              <button type="button" disabled={busy} onClick={submitBenefit} className={`${BTN} bg-[#fd8539] text-white`}>Aplicar</button>
            </div>
            <p className="text-[13px] text-slate-500">Dias de trial valem na hora. O desconto é aplicado automaticamente na próxima cobrança e vale pelos meses informados.</p>
          </div>
          <div className={`${CARD} overflow-x-auto p-0`}>
            <table className="w-full text-left text-[13px]">
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

      {aba === 'comunicacao' && (
        <CommunicationTab storeId={storeId} storeName={s.name} contactName={s.contact_name} whatsapp={s.whatsapp} email={s.contact_email || s.owner_contact_email} />
      )}

      {aba === 'dados' && (
        <div className={`${CARD} max-w-2xl space-y-3`}>
          {FIELDS.map(([k, l]) => (
            <label key={k} className="block space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{l}</span>
              {k === 'platform' ? (
                <select value={canonPlatform(form[k] || '')} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={`${INPUT} cursor-pointer`}>
                  <option value="">Selecione a plataforma</option>
                  {(PLATFORMS.includes(canonPlatform(form[k] || '')) || !form[k] ? PLATFORMS : [canonPlatform(form[k] || ''), ...PLATFORMS]).map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              ) : k === 'whatsapp' ? (
                <input inputMode="tel" value={maskBr(form[k] || '')} onChange={(e) => setForm({ ...form, [k]: onlyDigits(e.target.value).slice(0, 11) })} placeholder="(41) 99999-9999" className={INPUT} />
              ) : (
                <input value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className={INPUT} />
              )}
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
                className={`rounded-full border px-3 py-1 text-[13px] font-bold ${logFilter === k ? 'border-[#fd8539] bg-[#fd8539]/15 text-white' : 'border-white/10 text-slate-400'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className={`${CARD} overflow-x-auto p-0`}>
            <table className="w-full text-left text-[13px]">
              <thead><tr className="border-b border-white/10"><th className={TH}>Quando</th><th className={TH}>Origem</th><th className={TH}>O que</th><th className={TH}><label className="flex cursor-pointer items-center gap-2 normal-case tracking-normal"><input type="checkbox" checked={showCode} onChange={(e) => setShowCode(e.target.checked)} /> Detalhe · mostrar código técnico</label></th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {logRows.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">Sem registros.</td></tr>}
                {logRows.map((r, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-400">{dtt(r.at)}</td>
                    <td className="px-3 py-2 text-slate-300">{r.src === 'painel' ? 'Painel' : 'Widget'}</td>
                    <td className="px-3 py-2 font-bold text-white">{r.title}</td>
                    <td className="max-w-lg px-3 py-2 text-slate-300" title={r.detail}>{r.text || '—'}{showCode && r.detail && <span className="mt-1 block break-all font-mono text-xs text-slate-600">{r.detail}</span>}</td>
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