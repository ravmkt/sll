import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Copy, CreditCard, Loader2, Lock, QrCode, ShieldCheck, BadgeCheck, X, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLoja } from '@/contexts/LojaContext';
import { CYCLE_MONTHS, bumpRecurring, bumpTotal, useUpsells, type Cycle } from '@/components/checkout/OrderBumpCard';
import { brl } from '@/components/planos/planosShared';

const sb: any = supabase;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IN = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0094eb]';
const LB = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-500';
const CYCLES: { key: Cycle; label: string }[] = [
  { key: 'monthly', label: 'Mensal' },
  { key: 'semiannual', label: 'Semestral (17% OFF)' },
  { key: 'yearly', label: 'Anual (4 meses grátis)' },
];
const MSG: Record<string, string> = {
  MODULE_ALREADY_SUBSCRIBED: 'Sua loja já tem este módulo ativo.',
  PLANO_INDISPONIVEL: 'Este plano não está disponível para contratação no momento.',
  ADDON_INDISPONIVEL: 'Um dos add-ons não está mais disponível. Remova-o e tente de novo.',
  CUPOM_INVALIDO: 'Cupom inválido ou esgotado.',
  PLANO_INVALIDO: 'Este plano não está disponível.',
};

const digits = (v: string) => v.replace(/\D/g, '');
const maskDoc = (v: string) => {
  const d = digits(v).slice(0, 14);
  if (d.length <= 11) return d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  return d.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2');
};
const maskCep = (v: string) => { const d = digits(v).slice(0, 8); return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d; };
const maskPhone = (v: string) => {
  const d = digits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
};
const maskCard = (v: string) => digits(v).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
const maskExp = (v: string) => { const d = digits(v).slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };
const luhn = (n: string) => {
  let s = 0, alt = false;
  for (let i = n.length - 1; i >= 0; i--) { let d = Number(n[i]); if (alt) { d *= 2; if (d > 9) d -= 9; } s += d; alt = !alt; }
  return n.length >= 13 && s % 10 === 0;
};
const expOk = (v: string) => {
  const [m, y] = v.split('/');
  if (!m || !y || y.length !== 2) return false;
  const mm = Number(m), yy = 2000 + Number(y), now = new Date();
  return mm >= 1 && mm <= 12 && (yy > now.getFullYear() || (yy === now.getFullYear() && mm >= now.getMonth() + 1));
};

type Plan = {
  id: string; plan_name: string; is_combo: boolean; module_slug: string | null;
  price_monthly_cents: number; price_semiannual_cents: number; price_annual_cents: number;
};
type Mod = { slug: string; name: string; logo_url: string | null };
type Pix = { payload: string; image: string; expires_at: string | null };

const cents = (p: Plan, c: Cycle) => (c === 'monthly' ? p.price_monthly_cents : c === 'semiannual' ? p.price_semiannual_cents : p.price_annual_cents);

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={className}><span className={LB}>{label}</span>{children}</div>;
}

export default function CheckoutPage() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const { user } = useAuth() as { user: any };
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };

  const planId = sp.get('plan') || '';
  const [plan, setPlan] = useState<Plan | null>(null);
  const [mods, setMods] = useState<Mod[]>([]);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [cycle, setCycle] = useState<Cycle>((['monthly', 'semiannual', 'yearly'].includes(sp.get('cycle') || '') ? sp.get('cycle') : 'monthly') as Cycle);
  const [sel, setSel] = useState<Set<string>>(new Set((sp.get('addons') || '').split(',').filter((x) => UUID.test(x))));
  const upsells = useUpsells(slugs);

  const [method, setMethod] = useState<'CREDIT_CARD' | 'PIX'>('CREDIT_CARD');
  const [f, setF] = useState({ name: '', doc: '', phone: '', cep: '', address: '', number: '', complement: '', district: '' });
  const [cityUf, setCityUf] = useState('');
  const [card, setCard] = useState({ number: '', exp: '', cvv: '', holder: '' });
  const [agree, setAgree] = useState(false);
  const [coupon, setCoupon] = useState('');
  const [applied, setApplied] = useState<{ code: string; type: string; value: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pix, setPix] = useState<Pix | null>(null);
  const [subId, setSubId] = useState<string | null>(null);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!UUID.test(planId)) { setLoading(false); return; }
    let alive = true;
    (async () => {
      const { data: p } = await sb.from('dynamic_plans')
        .select('id,plan_name,is_combo,module_slug,is_active,price_monthly_cents,price_semiannual_cents,price_annual_cents')
        .eq('id', planId).eq('is_active', true).maybeSingle();
      if (!alive) return;
      if (!p) { setLoading(false); return; }
      let list: string[] = p.module_slug ? [p.module_slug] : [];
      if (p.is_combo) {
        const { data: cm } = await sb.from('combo_modules').select('module_slug').eq('plan_id', p.id);
        list = (cm || []).map((r: any) => r.module_slug);
      }
      const { data: hm } = list.length ? await sb.from('hub_modules').select('slug,name,logo_url').in('slug', list) : { data: [] };
      if (!alive) return;
      setPlan(p as Plan); setSlugs(list); setMods((hm || []) as Mod[]); setLoading(false);
    })();
    return () => { alive = false; };
  }, [planId]);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    sb.from('billing_info').select('*').eq('store_id', storeId).maybeSingle().then(({ data }: any) => {
      if (!alive) return;
      setF((p) => ({
        name: p.name || data?.legal_name || store?.contact_name || '',
        doc: p.doc || (data?.cnpj_cpf ? maskDoc(String(data.cnpj_cpf)) : ''),
        phone: p.phone || (data?.phone ? maskPhone(String(data.phone)) : ''),
        cep: p.cep || (data?.cep ? maskCep(String(data.cep)) : ''),
        address: p.address || data?.address || '',
        number: p.number || data?.number || '',
        complement: p.complement || data?.complement || '',
        district: p.district || data?.neighborhood || '',
      }));
    });
    return () => { alive = false; };
  }, [storeId, store?.contact_name]);

  // PIX: aguarda a confirmacao pelo webhook
  useEffect(() => {
    if (!pix || !subId) return;
    const t = setInterval(async () => {
      const { data } = await sb.from('subscriptions').select('status').eq('id', subId).maybeSingle();
      if (data && ['active', 'lifetime'].includes(data.status)) nav(`/billing/success?sub=${subId}`, { replace: true });
    }, 4000);
    return () => clearInterval(t);
  }, [pix, subId, nav]);

  const lookupCep = async () => {
    const z = digits(f.cep);
    if (z.length !== 8) return;
    try {
      const j = await (await fetch(`https://viacep.com.br/ws/${z}/json/`)).json();
      if (j.erro) return;
      setF((p) => ({ ...p, address: j.logradouro || p.address, district: j.bairro || p.district }));
      setCityUf(`${j.localidade || ''}${j.uf ? ' - ' + j.uf : ''}`);
    } catch { /* preenchimento manual */ }
  };

  const months = CYCLE_MONTHS[cycle];
  const bumpIds = upsells.filter((a) => sel.has(a.id)).map((a) => a.id);
  const planCents = plan ? cents(plan, cycle) : 0;
  const discount = !applied ? 0 : applied.type === 'percentage' ? Math.round((planCents * applied.value) / 100) : Math.min(planCents, applied.value);
  const addonCents = Math.round(bumpTotal(upsells, new Set(bumpIds), cycle) * 100);
  const total = Math.max(0, planCents - discount + addonCents);
  const renewalCents = Math.max(0, planCents - discount + Math.round(bumpRecurring(upsells, new Set(bumpIds), cycle) * 100));
  const renewal = useMemo(() => { const d = new Date(); d.setMonth(d.getMonth() + months); return d.toLocaleDateString('pt-BR'); }, [months]);

  const applyCoupon = async () => {
    const code = coupon.trim();
    if (!code || !plan) return;
    const { data, error } = await sb.rpc('validate_coupon', { p_code: code, p_plan_id: plan.id });
    if (error || !data?.valid) {
      setApplied(null);
      const R: Record<string, string> = {
        not_found: 'Cupom não encontrado.',
        expired: 'Este cupom expirou.',
        exhausted: 'Este cupom esgotou.',
        not_started: 'Este cupom ainda não está valendo.',
        plan_not_allowed: 'Este cupom não vale para este plano.',
      };
      toast.error(error ? 'Erro ao validar o cupom: ' + (error as any).message : (R[(data as any)?.reason] ?? MSG.CUPOM_INVALIDO));
      return;
    }
    setApplied({ code, type: data.type, value: Number(data.value) });
    toast.success('Cupom aplicado.');
  };

  const problem = (): string | null => {
    if (!plan) return 'plano';
    if (f.name.trim().length < 3) return 'nome do pagador';
    if (![11, 14].includes(digits(f.doc).length)) return 'CPF ou CNPJ';
    if (digits(f.phone).length < 10) return 'telefone com DDD';
    if (digits(f.cep).length !== 8) return 'CEP';
    if (!f.address.trim() || !f.number.trim()) return 'endereço e número';
    if (method === 'CREDIT_CARD') {
      if (!luhn(digits(card.number))) return 'número do cartão válido';
      if (!expOk(card.exp)) return 'validade (MM/AA)';
      if (digits(card.cvv).length < 3) return 'CVV';
      if (card.holder.trim().length < 3) return 'nome no cartão';
    }
    if (!agree) return 'aceite da renovação automática';
    return null;
  };
  const pend = problem();

  const submit = async () => {
    if (pend || !plan || !storeId) return;
    setBusy(true);
    const [mm, yy] = card.exp.split('/');
    const { data, error } = await supabase.functions.invoke('asaas-checkout', {
      body: {
        store_id: storeId, plan_id: plan.id, billing_cycle: cycle.toUpperCase(), method,
        selected_addon_ids: bumpIds, coupon_code: applied?.code ?? null,
        payer: { name: f.name.trim(), cpfCnpj: digits(f.doc), email: user?.email, phone: digits(f.phone), postalCode: digits(f.cep), address: f.address.trim(), addressNumber: f.number.trim(), complement: f.complement.trim(), province: f.district.trim() },
        card: method === 'CREDIT_CARD' ? { holderName: card.holder.trim(), number: digits(card.number), expiryMonth: mm, expiryYear: yy, ccv: digits(card.cvv) } : null,
      },
    });
    let body: any = data;
    if (error && (error as any).context) { try { body = await (error as any).context.json(); } catch { /* usa o padrao */ } }
    setBusy(false);
    if (error || body?.error) {
      toast.error(body?.message || MSG[body?.error] || 'Não foi possível concluir o pagamento. Tente novamente.');
      setCard((c) => ({ ...c, cvv: '' }));
      return;
    }
    setSubId(body.subscription_id);
    if (method === 'PIX' && body.pix) { setPix(body.pix); return; }
    nav(`/billing/success?sub=${body.subscription_id}`, { replace: true });
  };

  const copyPix = async () => {
    if (!pix) return;
    try { await navigator.clipboard.writeText(pix.payload); toast.success('Código Pix copiado.'); } catch { toast.error('Não foi possível copiar.'); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  if (!plan) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
        <p className="text-sm font-semibold text-slate-700">Plano não encontrado ou indisponível.</p>
        <Link to="/dashboard/planos" className="rounded-xl bg-[#0094eb] px-5 py-2.5 text-sm font-bold text-white">Ver planos</Link>
      </div>
    );
  }

  const card1 = 'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm';
  const tab = (on: boolean) => `flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-colors ${on ? 'border-[#0094eb] bg-[#0094eb]/5 text-[#0094eb]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
        <Link to="/dashboard"><img src="/assets/sll-hub-logo-wide.png" alt="SLL Hub" className="h-8 w-auto object-contain" /></Link>
        <Link to="/dashboard/planos" className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0094eb]"><ArrowLeft size={14} /> Voltar aos planos</Link>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-5">
          {upsells.length > 0 && !pix && (
            <section className={card1}>
              <h2 className="mb-4 text-lg font-black">Ofertas adicionais, selecionadas especialmente para você</h2>
              <div className="space-y-3">
                {upsells.map((a) => {
                  const on = sel.has(a.id);
                  return (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 p-4">
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-black"><Zap size={14} className="text-[#fd8539]" /> {a.upsell_headline || a.name}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{a.name}{a.description ? `: ${a.description}` : ''}</p>
                      </div>
                      <p className="text-sm font-black">{brl(Math.round(a.price_monthly * 100))}<span className="text-xs font-semibold text-slate-400">{a.billing_type === 'one_time' ? ' · único' : '/mês'}</span></p>
                      <button type="button" onClick={() => setSel((s) => { const n = new Set(s); if (n.has(a.id)) n.delete(a.id); else n.add(a.id); return n; })}
                        className={`cursor-pointer rounded-full border px-4 py-1.5 text-xs font-bold ${on ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-slate-800 text-slate-800 hover:bg-slate-50'}`}>
                        {on ? <span className="flex items-center gap-1"><Check size={13} /> Adicionado · Remover</span> : 'Selecionar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <section className={card1}>
            <h2 className="mb-3 text-lg font-black">Sua conta</h2>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white"><Check size={12} /></span>
              {user?.email}
              <span className="ml-auto text-[11px] font-bold uppercase text-emerald-600">Verificado</span>
            </div>
          </section>

          {pix ? (
            <section className={`${card1} space-y-4 text-center`}>
              <h2 className="text-lg font-black">Pague com Pix para ativar</h2>
              <img src={`data:image/png;base64,${pix.image}`} alt="QR Code Pix" className="mx-auto h-52 w-52" />
              <button type="button" onClick={copyPix} className="mx-auto flex cursor-pointer items-center gap-2 rounded-xl bg-[#0094eb] px-5 py-2.5 text-sm font-bold text-white"><Copy size={15} /> Copiar código Pix</button>
              <p className="flex items-center justify-center gap-2 text-xs text-slate-500"><Loader2 size={13} className="animate-spin" /> Aguardando a confirmação do pagamento. Esta tela atualiza sozinha.</p>
            </section>
          ) : (
            <section className={`${card1} space-y-5`}>
              <h2 className="text-lg font-black">Insira as informações de pagamento</h2>
              <div className="flex gap-3">
                <button type="button" onClick={() => setMethod('CREDIT_CARD')} className={tab(method === 'CREDIT_CARD')}><CreditCard size={16} /> Cartão de crédito</button>
                <button type="button" onClick={() => setMethod('PIX')} className={tab(method === 'PIX')}><QrCode size={16} /> Pix</button>
              </div>

              {method === 'CREDIT_CARD' && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Número do cartão" className="sm:col-span-2"><input inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={(e) => setCard({ ...card, number: maskCard(e.target.value) })} className={IN} placeholder="0000 0000 0000 0000" /></Field>
                  <Field label="Validade (MM/AA)"><input inputMode="numeric" autoComplete="cc-exp" value={card.exp} onChange={(e) => setCard({ ...card, exp: maskExp(e.target.value) })} className={IN} placeholder="MM/AA" /></Field>
                  <Field label="CVV"><input inputMode="numeric" autoComplete="cc-csc" value={card.cvv} onChange={(e) => setCard({ ...card, cvv: digits(e.target.value).slice(0, 4) })} className={IN} placeholder="123" /></Field>
                  <Field label="Nome no cartão" className="sm:col-span-2"><input autoComplete="cc-name" value={card.holder} onChange={(e) => setCard({ ...card, holder: e.target.value })} className={IN} /></Field>
                </div>
              )}

              <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 sm:col-span-2">Dados de cobrança (nota fiscal e antifraude)</p>
                <Field label="Nome ou razão social"><input value={f.name} onChange={(e) => set('name', e.target.value)} className={IN} /></Field>
                <Field label="CPF ou CNPJ"><input inputMode="numeric" value={f.doc} onChange={(e) => set('doc', maskDoc(e.target.value))} className={IN} /></Field>
                <Field label="Telefone"><input inputMode="tel" value={f.phone} onChange={(e) => set('phone', maskPhone(e.target.value))} className={IN} placeholder="(41) 99999-9999" /></Field>
                <Field label="CEP"><input inputMode="numeric" value={f.cep} onChange={(e) => set('cep', maskCep(e.target.value))} onBlur={lookupCep} className={IN} placeholder="00000-000" /></Field>
                <Field label="Endereço" className="sm:col-span-2"><input value={f.address} onChange={(e) => set('address', e.target.value)} className={IN} /></Field>
                <Field label="Número"><input value={f.number} onChange={(e) => set('number', e.target.value)} className={IN} /></Field>
                <Field label="Complemento"><input value={f.complement} onChange={(e) => set('complement', e.target.value)} className={IN} /></Field>
                <Field label="Bairro"><input value={f.district} onChange={(e) => set('district', e.target.value)} className={IN} /></Field>
                <Field label="Cidade / UF"><input value={cityUf} readOnly placeholder="Preenchido pelo CEP" className={`${IN} bg-slate-50 text-slate-500`} /></Field>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <BadgeCheck size={22} className="mt-0.5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-black text-emerald-800">Garantia incondicional de 14 dias</p>
                    <p className="text-xs text-emerald-700">Não gostou? Cancele em até 14 dias e receba o reembolso integral, sem burocracia.</p>
                  </div>
                </div>
                <label className="flex cursor-pointer items-start gap-2.5 text-sm font-semibold">
                  <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 h-4 w-4" />
                  Aceitar a renovação automática para garantir acesso contínuo
                </label>
                <p className="text-[11px] leading-relaxed text-slate-500">
                  Ao clicar em "Concordar e assinar", você autoriza a cobrança de {brl(total)} hoje e a renovação automática a cada {months === 1 ? 'mês' : `${months} meses`} no valor de {brl(renewalCents)}, até o cancelamento.
                  Cancele a qualquer momento pelo painel, sem multa. Garantia incondicional de 14 dias: se cancelar em até 14 dias após a assinatura, você recebe o reembolso integral do valor pago (solicite pelo suporte). Veja os <Link to="/termos" className="underline">Termos de Serviço</Link>.
                </p>
                <button type="button" disabled={!!pend || busy} onClick={submit}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#3b63fb] py-3.5 text-sm font-bold text-white hover:bg-[#2f52d6] disabled:cursor-not-allowed disabled:opacity-40">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Lock size={15} />} {busy ? 'Processando...' : method === 'PIX' ? 'Concordar e gerar Pix' : 'Concordar e assinar'}
                </button>
                {pend && <p className="text-center text-[11px] text-slate-400">Falta preencher: {pend}.</p>}
              </div>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
          <h2 className="text-lg font-black">Seu carrinho</h2>
          <label className="block">
            <span className={LB}>Assinatura</span>
            <select value={cycle} onChange={(e) => setCycle(e.target.value as Cycle)} disabled={!!pix} className={`${IN} cursor-pointer`}>
              {CYCLES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </label>

          <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
            <div className="flex shrink-0 gap-1">
              {mods.map((m) => m.logo_url
                ? <img key={m.slug} src={m.logo_url} alt={m.name} className="h-9 w-9 rounded-lg object-contain" />
                : <span key={m.slug} className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0094eb]/10 text-sm font-black text-[#0094eb]">{m.name.charAt(0)}</span>)}
            </div>
            <p className="min-w-0 flex-1 text-sm font-bold leading-tight">{plan.plan_name}</p>
            <p className="text-sm font-black">{brl(planCents)}</p>
          </div>

          {upsells.filter((a) => sel.has(a.id)).map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <p className="min-w-0 flex-1 text-sm font-semibold leading-tight">{a.name}</p>
              <p className="text-sm font-black">{brl(Math.round(a.price_monthly * 100 * (a.billing_type === 'one_time' ? 1 : months)))}</p>
              {!pix && <button type="button" aria-label="Remover" onClick={() => setSel((s) => { const n = new Set(s); n.delete(a.id); return n; })} className="cursor-pointer text-slate-400 hover:text-rose-500"><X size={15} /></button>}
            </div>
          ))}

          {!pix && (
            <div className="flex gap-2">
              <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Cupom de desconto" className={IN} />
              <button type="button" onClick={applyCoupon} className="cursor-pointer rounded-xl border border-slate-300 px-4 text-xs font-bold hover:bg-slate-50">Aplicar</button>
            </div>
          )}

          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-sm">
            <div className="flex justify-between text-slate-600"><span>Subtotal</span><span>{brl(planCents + addonCents)}</span></div>
            {discount > 0 && <div className="flex justify-between font-semibold text-emerald-600"><span>Desconto ({applied?.code})</span><span>- {brl(discount)}</span></div>}
            <div className="flex items-end justify-between pt-1"><span className="text-base font-black">Total hoje</span><span className="text-2xl font-black">{brl(total)}</span></div>
            {total !== renewalCents ? (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
                <p className="font-black">Atenção: o valor de hoje não se repete</p>
                <p>Hoje você paga <strong>{brl(total)}</strong>, incluindo <strong>{brl(total - renewalCents)}</strong> de pagamento único.</p>
                <p>
                  A partir de <strong>{renewal}</strong>, a renovação será de <strong className="text-sm">{brl(renewalCents)}</strong>
                  {months === 1 ? '/mês' : ` a cada ${months} meses`}.
                </p>
              </div>
            ) : (
              <p className="text-xs font-semibold text-slate-700">
                Próxima renovação em <strong>{renewal}</strong> no valor de <strong>{brl(renewalCents)}</strong>.
              </p>
            )}
          </div>

          <ul className="space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
            {['Garantia de 14 dias com reembolso integral', 'Compra 100% segura', 'Cancele a qualquer momento direto pelo painel', 'Sem multa e sem fidelidade'].map((t) => (
              <li key={t} className="flex items-center gap-2"><ShieldCheck size={14} className="shrink-0 text-emerald-500" /> {t}</li>
            ))}
          </ul>
        </aside>
      </main>
    </div>
  );
}