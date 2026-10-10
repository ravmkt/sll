import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { getPlansShowcase, getPriceForCycle, subscribeToPlan, subscribeToDynamicPlan, type Plan, type PlanPrice } from '@/services/plans/getPlansShowcase';

type Cycle = 'monthly' | 'semiannual' | 'yearly';
type Person = 'pf' | 'pj';

const sb: any = supabase;
const CYCLE_LABEL: Record<Cycle, string> = { monthly: 'Mensal', semiannual: 'Semestral', yearly: 'Anual' };
const brl = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const digits = (v: string) => v.replace(/\D/g, '');

const ERR: Record<string, string> = {
  SESSAO_EXPIRADA: 'Sessão expirada. Faça login novamente.',
  MODULE_ALREADY_SUBSCRIBED: 'Você já possui este módulo ativo na sua loja.',
  TRIAL_ACTIVE: 'Seu teste deste módulo já está ativo.',
  DB_ERROR: 'Não foi possível registrar a assinatura. Tente novamente.',
  CUPOM_INVALIDO: 'Cupom inválido ou esgotado.',
  CUPOM_VALOR_MINIMO: 'O valor final ficaria abaixo do mínimo de R$ 5,00.',
  DADOS_FISCAIS_OBRIGATORIOS: 'Preencha os dados de faturamento.',
  ASAAS_CUSTOMER_ERROR: 'O Asaas recusou os dados. Confira CPF/CNPJ, CEP e telefone.',
  ASAAS_SUBSCRIPTION_ERROR: 'O Asaas recusou a assinatura. Tente novamente em instantes.',
};
const COUPON_REASON: Record<string, string> = {
  not_found: 'Cupom não encontrado.',
  expired: 'Este cupom expirou.',
  exhausted: 'Este cupom esgotou.',
  not_started: 'Este cupom ainda não está valendo.',
  plan_not_allowed: 'Este cupom não vale para este plano.',
};

function validCpf(v: string) {
  const d = digits(v);
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  for (const t of [9, 10]) {
    let s = 0;
    for (let i = 0; i < t; i++) s += Number(d[i]) * (t + 1 - i);
    if (((s * 10) % 11) % 10 !== Number(d[t])) return false;
  }
  return true;
}
function validCnpj(v: string) {
  const d = digits(v);
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const calc = (n: number) => {
    let s = 0, p = n - 7;
    for (let i = 0; i < n; i++) { s += Number(d[i]) * p--; if (p < 2) p = 9; }
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return calc(12) === Number(d[12]) && calc(13) === Number(d[13]);
}
const maskDoc = (v: string, t: Person) => {
  const d = digits(v).slice(0, t === 'pf' ? 11 : 14);
  return t === 'pf'
    ? d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    : d.replace(/(\d{2})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1/$2').replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};
const maskCep = (v: string) => digits(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
const maskPhone = (v: string) => {
  const d = digits(v).slice(0, 11);
  return d.length > 10 ? d.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3') : d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
};

const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0091ff]';
const labelCls = 'block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1';

type Form = {
  type: Person; name: string; doc: string; email: string; phone: string;
  cep: string; address: string; number: string; complement: string; neighborhood: string; city: string; state: string;
};
const emptyForm: Form = { type: 'pf', name: '', doc: '', email: '', phone: '', cep: '', address: '', number: '', complement: '', neighborhood: '', city: '', state: '' };

type Applied = { code: string; type: 'percentage' | 'fixed_amount'; value: number };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolve plano de dynamic_plans por uuid ou por tier (starter/pro/scale) + modulo
async function resolveDynamic(key: string | null, moduleKey: string | null): Promise<{ plan: Plan; prices: PlanPrice[] } | null> {
  if (!key) return null;
  let q = sb.from('dynamic_plans')
    .select('id, plan_tier, plan_name, module_slug, is_active, price_monthly_cents, price_semiannual_cents, price_annual_cents')
    .eq('is_active', true);
  q = UUID_RE.test(key) ? q.eq('id', key) : q.eq('plan_tier', key).eq('module_slug', moduleKey ?? 'vidlytics').eq('is_combo', false);
  const { data, error } = await q.limit(1).maybeSingle();
  if (error || !data) return null;
  const plan = {
    id: data.id, slug: data.plan_tier, name: data.plan_name, description: null,
    price_cents: data.price_monthly_cents, modules: data.module_slug ? [data.module_slug] : [],
    is_popular: false, is_active: true, sort_order: 0, views_limit: 0, storage_limit_bytes: 0,
    pages_limit: 0, videos_limit: null, allows_live: null,
  } as Plan;
  const prices: PlanPrice[] = [
    { plan_id: data.id, billing_cycle: 'monthly', price_cents: data.price_monthly_cents, is_active: true },
    { plan_id: data.id, billing_cycle: 'semiannual', price_cents: data.price_semiannual_cents, is_active: true },
    { plan_id: data.id, billing_cycle: 'yearly', price_cents: data.price_annual_cents, is_active: true },
  ];
  return { plan, prices };
}

export default function Checkout() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { storeId } = useLoja();

  const planId = params.get('plan');
  const cycle = (['monthly', 'semiannual', 'yearly'].includes(params.get('cycle') ?? '') ? params.get('cycle') : 'monthly') as Cycle;
  const moduleKey = params.get('module');

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [prices, setPrices] = useState<PlanPrice[]>([]);
  const [f, setF] = useState<Form>(emptyForm);
  const [couponInput, setCouponInput] = useState('');
  const [applied, setApplied] = useState<Applied | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponBusy, setCouponBusy] = useState(false);
  const [cepBusy, setCepBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [dynamic, setDynamic] = useState(false);
  const [trialEligible, setTrialEligible] = useState(false);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  useEffect(() => {
    getPlansShowcase().then(async ({ plans, prices }) => {
      let found: Plan | null = plans.find((p) => p.id === planId) ?? null;
      let pr: PlanPrice[] = prices;
      if (!found) {
        const r = await resolveDynamic(planId, moduleKey);
        if (r) { found = r.plan; pr = r.prices; setDynamic(true); }
      }
      setPlan(found);
      setPrices(pr);
      setLoading(false);
    });
  }, [planId]);

  useEffect(() => {
    if (!storeId) return;
    sb.from('billing_info').select('*').eq('store_id', storeId).maybeSingle().then(({ data }: any) => {
      if (!data) return;
      setF({
        type: data.person_type === 'pj' || digits(data.cnpj_cpf ?? '').length === 14 ? 'pj' : 'pf',
        name: data.legal_name ?? '', doc: data.cnpj_cpf ?? '', email: data.email ?? '', phone: data.phone ?? '',
        cep: data.cep ?? '', address: data.address ?? '', number: data.number ?? '', complement: data.complement ?? '',
        neighborhood: data.neighborhood ?? '', city: data.city ?? '', state: data.state ?? '',
      });
    });
  }, [storeId]);

  const trialModule = plan ? (plan.modules.length === 1 ? plan.modules[0] : moduleKey) : null;
  useEffect(() => {
    if (!storeId || !trialModule || trialModule === 'bundle') { setTrialEligible(false); return; }
    let alive = true;
    sb.from('subscriptions').select('status,module_key').eq('store_id', storeId).then(({ data }: any) => {
      if (!alive) return;
      const rows: any[] = data ?? [];
      const hadModule = rows.some((r) => r.module_key === trialModule && r.status !== 'incomplete');
      const hasPaid = rows.some((r) => ['active', 'lifetime', 'past_due'].includes(r.status));
      setTrialEligible(!hadModule && hasPaid);
    });
    return () => { alive = false; };
  }, [storeId, trialModule]);

  const priceCents = plan ? getPriceForCycle(plan.id, cycle, prices, plan.price_cents) : 0;
  const discountCents = useMemo(() => {
    if (!applied) return 0;
    const d = applied.type === 'percentage' ? Math.round((priceCents * applied.value) / 100) : applied.value;
    return Math.min(Math.max(d, 0), priceCents);
  }, [applied, priceCents]);
  const finalCents = priceCents - discountCents;

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code || !plan) return;
    setCouponBusy(true); setCouponMsg(null);
    const { data, error } = await sb.rpc('validate_coupon', { p_code: code, p_plan_id: plan.id });
    setCouponBusy(false);
    if (error || !data?.valid) {
      setApplied(null);
      setCouponMsg(COUPON_REASON[data?.reason] ?? 'Não foi possível validar o cupom.');
      return;
    }
    const d = data.type === 'percentage' ? Math.round((priceCents * Number(data.value)) / 100) : Number(data.value);
    if (priceCents - Math.min(d, priceCents) < 500) {
      setApplied(null);
      setCouponMsg('O valor final ficaria abaixo do mínimo de R$ 5,00.');
      return;
    }
    setApplied({ code: code.toUpperCase(), type: data.type, value: Number(data.value) });
  }

  async function lookupCep(value: string) {
    const d = digits(value);
    if (d.length !== 8) return;
    setCepBusy(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${d}/json/`);
      const j = await r.json();
      if (j.erro) { setErrors((e) => ({ ...e, cep: 'CEP não encontrado.' })); return; }
      setErrors((e) => { const { cep, ...rest } = e; return rest; });
      setF((x) => ({ ...x, address: j.logradouro || x.address, neighborhood: j.bairro || x.neighborhood, city: j.localidade || x.city, state: j.uf || x.state }));
    } catch { /* o usuário preenche manualmente */ }
    finally { setCepBusy(false); }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = 'Informe o nome ou razão social.';
    if (f.type === 'pf' ? !validCpf(f.doc) : !validCnpj(f.doc)) e.doc = f.type === 'pf' ? 'CPF inválido.' : 'CNPJ inválido.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'E-mail inválido.';
    if (digits(f.phone).length < 10) e.phone = 'Telefone inválido.';
    if (digits(f.cep).length !== 8) e.cep = 'CEP inválido.';
    if (!f.address.trim()) e.address = 'Informe o endereço.';
    if (!f.number.trim()) e.number = 'Informe o número.';
    if (!f.neighborhood.trim()) e.neighborhood = 'Informe o bairro.';
    if (!f.city.trim()) e.city = 'Informe a cidade.';
    if (f.state.trim().length !== 2) e.state = 'UF inválida.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!storeId || !plan) return;
    if (!validate()) { toast.error('Confira os campos destacados.'); return; }
    setSubmitting(true);
    const { error: upErr } = await sb.from('billing_info').upsert({
      store_id: storeId, person_type: f.type, legal_name: f.name.trim(), cnpj_cpf: digits(f.doc),
      email: f.email.trim(), phone: digits(f.phone), cep: digits(f.cep), address: f.address.trim(),
      number: f.number.trim(), complement: f.complement.trim() || null, neighborhood: f.neighborhood.trim(),
      city: f.city.trim(), state: f.state.trim().toUpperCase(),
    }, { onConflict: 'store_id' });
    if (upErr) { setSubmitting(false); toast.error('Não foi possível salvar os dados: ' + upErr.message); return; }

    const result = dynamic
      ? await subscribeToDynamicPlan({ storeId, dynamicPlanId: plan.id, billingCycle: cycle, couponCode: applied?.code ?? null })
      : await subscribeToPlan({ storeId, planId: plan.id, billingCycle: cycle, moduleKey, couponCode: applied?.code ?? null });
    if (result.error) {
      setSubmitting(false);
      if (result.error === 'TRIAL_ACTIVE' && result.invoiceUrl) {
        toast.info('Seu teste já está ativo. Abrindo a fatura...');
        window.location.href = result.invoiceUrl;
        return;
      }
      toast.error(ERR[result.error] ?? result.error);
      return;
    }
    if (result.trial) {
      toast.success('Teste de 7 dias ativado! A fatura fica disponível em Minhas Assinaturas.');
      window.location.assign('/dashboard'); // recarrega para a tarja ler o novo trial
      return;
    }
    if (result.invoiceUrl) {
      toast.success('Redirecionando para o pagamento...');
      window.location.href = result.invoiceUrl;
      return;
    }
    setSubmitting(false);
    toast.success('Assinatura criada. A fatura aparece em Minhas Assinaturas.');
    navigate('/dashboard/assinaturas');
  }

  const field = (k: keyof Form, label: string, opts?: { span?: string; mask?: (v: string) => string; placeholder?: string; onBlur?: () => void }) => (
    <div className={opts?.span}>
      <label className={labelCls}>{label}</label>
      <input
        className={inputCls + (errors[k] ? ' !border-rose-400' : '')}
        value={f[k] as string}
        placeholder={opts?.placeholder}
        onBlur={opts?.onBlur}
        onChange={(e) => set(k, (opts?.mask ? opts.mask(e.target.value) : e.target.value) as never)}
      />
      {errors[k] && <p className="mt-1 text-[11px] text-rose-500">{errors[k]}</p>}
    </div>
  );

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#0091ff]" /></div>
      </DashboardLayout>
    );
  }

  if (!plan) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-lg py-20 text-center space-y-4">
          <p className="text-slate-600">Plano não encontrado.</p>
          <button type="button" onClick={() => navigate('/dashboard/planos')} className="text-sm font-bold text-[#0091ff]">Voltar para os planos</button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-6 pb-20">
        <button type="button" onClick={() => navigate('/dashboard/planos')}
          className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-[#0091ff]">
          <ArrowLeft size={16} /> Voltar para os planos
        </button>
        <h1 className="text-2xl font-black text-slate-900">Finalizar assinatura</h1>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h2 className="text-sm font-black text-slate-900">Dados de faturamento (nota fiscal)</h2>
            <div className="flex gap-2">
              {(['pf', 'pj'] as Person[]).map((t) => (
                <button key={t} type="button" onClick={() => setF((x) => ({ ...x, type: t, doc: '' }))}
                  className={'px-4 py-2 rounded-xl text-xs font-black border ' + (f.type === t ? 'bg-[#0091ff] text-white border-[#0091ff]' : 'bg-white text-slate-500 border-slate-200')}>
                  {t === 'pf' ? 'Pessoa física' : 'Pessoa jurídica'}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {field('name', f.type === 'pf' ? 'Nome completo' : 'Razão social', { span: 'sm:col-span-2' })}
              {field('doc', f.type === 'pf' ? 'CPF' : 'CNPJ', { mask: (v) => maskDoc(v, f.type) })}
              {field('phone', 'Telefone / WhatsApp', { mask: maskPhone, placeholder: '(41) 99999-9999' })}
              {field('email', 'E-mail para a nota fiscal', { span: 'sm:col-span-2' })}
              <div>
                <label className={labelCls}>CEP {cepBusy && <Loader2 className="inline h-3 w-3 animate-spin" />}</label>
                <input className={inputCls + (errors.cep ? ' !border-rose-400' : '')} value={f.cep} placeholder="00000-000"
                  onChange={(e) => { const v = maskCep(e.target.value); set('cep', v); if (digits(v).length === 8) lookupCep(v); }} />
                {errors.cep && <p className="mt-1 text-[11px] text-rose-500">{errors.cep}</p>}
              </div>
              {field('address', 'Endereço')}
              {field('number', 'Número')}
              {field('complement', 'Complemento (opcional)')}
              {field('neighborhood', 'Bairro')}
              {field('city', 'Cidade')}
              {field('state', 'UF', { mask: (v) => v.toUpperCase().slice(0, 2) })}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
              <h2 className="text-sm font-black text-slate-900">Resumo</h2>
              <div className="flex justify-between text-sm"><span className="text-slate-600">{plan.name}</span><span className="font-semibold">{CYCLE_LABEL[cycle]}</span></div>
              <div className="flex justify-between text-sm"><span className="text-slate-600">Valor</span><span>{brl(priceCents)}</span></div>
              {discountCents > 0 && (
                <div className="flex justify-between text-sm text-emerald-600"><span>Cupom {applied?.code}</span><span>- {brl(discountCents)}</span></div>
              )}
              <div className="flex justify-between border-t border-slate-100 pt-3 text-base font-black text-slate-900"><span>Total</span><span>{brl(finalCents)}</span></div>
              {trialEligible && (
                <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                  Teste grátis de 7 dias. A primeira cobrança vence em {new Date(Date.now() + 7 * 86400000).toLocaleDateString('pt-BR')}.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-2">
              <label className={labelCls}><Tag className="inline h-3 w-3 mr-1" />Cupom de desconto</label>
              <div className="flex gap-2">
                <input className={inputCls + ' uppercase'} value={couponInput} placeholder="BLACK10"
                  onChange={(e) => { setCouponInput(e.target.value); if (applied) setApplied(null); setCouponMsg(null); }} />
                <button type="button" disabled={couponBusy || !couponInput.trim()} onClick={applyCoupon}
                  className="px-4 rounded-xl bg-slate-900 text-white text-xs font-black disabled:opacity-50">
                  {couponBusy ? '...' : 'Aplicar'}
                </button>
              </div>
              {applied && <p className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Cupom aplicado.</p>}
              {couponMsg && <p className="text-xs text-rose-500">{couponMsg}</p>}
            </div>

            <button type="button" disabled={submitting} onClick={submit}
              className="w-full rounded-2xl bg-[#0091ff] py-3 text-sm font-black text-white hover:bg-[#0080e0] disabled:opacity-60">
              {submitting ? 'Processando...' : trialEligible ? 'Iniciar teste de 7 dias' : 'Ir para o pagamento'}
            </button>
            <p className="text-center text-[11px] text-slate-400">O pagamento é feito no ambiente seguro do Asaas.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}