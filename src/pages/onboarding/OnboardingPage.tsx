import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ONBOARDING_DONE_EVENT, ONBOARDING_SKIP_KEY } from '@/components/onboarding/OnboardingGuard';
import { StepStoreData } from '@/components/onboarding/StepStoreData';
import { StepConnection } from '@/components/onboarding/StepConnection';
import { StepBrand } from '@/components/onboarding/StepBrand';
import { StepSummary } from '@/components/onboarding/StepSummary';
import { DEFAULT_BRAND, HEX, digits, maskPhone, normalizeUrl, type Method, type WizardData } from '@/components/onboarding/shared';

const sb: any = supabase;
const TITLES = ['Dados da loja', 'Conexão do script', 'Identidade da marca', 'Conclusão'];
const EMPTY: WizardData = { store_url: '', store_niche: '', manager_whatsapp: '', connection_method: 'gtm', script_verified: false, brand: DEFAULT_BRAND };

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(EMPTY);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) { navigate('/auth', { replace: true }); return; }
      const { data: r, error: e } = await sb.from('stores')
        .select('id,onboarding_step,onboarding_completed,store_url,store_niche,manager_whatsapp,connection_method,script_verified,brand_settings')
        .eq('owner_user_id', auth.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (!alive) return;
      if (e || !r) { setFailed(true); return; }
      if (r.onboarding_completed) { navigate('/dashboard', { replace: true }); return; }
      const bs = (r.brand_settings || {}) as Partial<WizardData['brand']>;
      const m: Method = r.connection_method === 'manual' ? 'manual' : 'gtm';
      setData({
        store_url: r.store_url ?? '', store_niche: r.store_niche ?? '', manager_whatsapp: maskPhone(r.manager_whatsapp ?? ''),
        connection_method: m, script_verified: r.script_verified === true,
        brand: {
          ...DEFAULT_BRAND, ...bs,
          social_links: { ...DEFAULT_BRAND.social_links, ...(bs.social_links || {}) },
          benefits: Array.isArray(bs.benefits) ? bs.benefits : DEFAULT_BRAND.benefits,
        },
      });
      setStep(Math.min(4, Math.max(1, Number(r.onboarding_step) || 1)));
      setStoreId(r.id);
      setReady(true);
    })();
    return () => { alive = false; };
  }, [navigate]);

  const validate = (s: number): string | null => {
    if (s === 1) {
      if (!normalizeUrl(data.store_url)) return 'Informe a URL da sua loja (ex.: www.sualoja.com.br).';
      if (!data.store_niche) return 'Selecione o nicho principal.';
      const n = digits(data.manager_whatsapp).length;
      if (n < 10 || n > 11) return 'Informe um WhatsApp válido com DDD.';
    }
    if (s === 3 && (!HEX.test(data.brand.primary_color) || !HEX.test(data.brand.secondary_color))) return 'Informe as cores no formato #RRGGBB.';
    return null;
  };

  const save = async (d: WizardData, to: number, completed = false): Promise<boolean> => {
    if (!storeId) return false;
    setBusy(true);
    const p_data: Record<string, unknown> = {
      store_url: normalizeUrl(d.store_url) ?? '', store_niche: d.store_niche,
      manager_whatsapp: digits(d.manager_whatsapp), connection_method: d.connection_method,
    };
    if (HEX.test(d.brand.primary_color) && HEX.test(d.brand.secondary_color)) {
      p_data.brand_settings = { ...d.brand, benefits: d.brand.benefits.map((x) => x.trim()).filter(Boolean).slice(0, 8) };
    }
    const { error: e } = await sb.rpc('save_onboarding_progress', { p_store_id: storeId, p_step: to, p_completed: completed, p_data });
    setBusy(false);
    if (e) { setError(e.message); return false; }
    return true;
  };

  const next = async () => {
    const msg = validate(step);
    if (msg) { setError(msg); return; }
    setError(null);
    let d = data;
    if (step === 1) d = { ...d, store_url: normalizeUrl(d.store_url) ?? d.store_url };
    if (step === 2 && !d.brand.social_links.whatsapp && d.manager_whatsapp) {
      d = { ...d, brand: { ...d.brand, social_links: { ...d.brand.social_links, whatsapp: digits(d.manager_whatsapp) } } };
    }
    setData(d);
    if (await save(d, step + 1)) setStep(step + 1);
  };
  const back = async () => { setError(null); const to = Math.max(1, step - 1); if (await save(data, to)) setStep(to); };
  const later = async () => { await save(data, step); sessionStorage.setItem(ONBOARDING_SKIP_KEY, '1'); navigate('/dashboard'); };
  const finish = async () => {
    const msg = validate(1) || validate(3);
    if (msg) { setError(msg); return; }
    setError(null);
    if (await save(data, 4, true)) {
      sessionStorage.removeItem(ONBOARDING_SKIP_KEY);
      window.dispatchEvent(new Event(ONBOARDING_DONE_EVENT));
      navigate('/dashboard', { replace: true });
    }
  };
  const onChange = (patch: Partial<WizardData>) => setData((d) => ({ ...d, ...patch }));
  const pct = Math.round((step / 4) * 100);
  const wrap = 'fixed inset-0 z-[60] overflow-y-auto bg-slate-50';

  if (failed) return <div className={`${wrap} flex items-center justify-center p-6 text-sm text-slate-600`}>Não encontramos uma loja para a sua conta. Saia e entre novamente.</div>;
  if (!ready || !storeId) return <div className={`${wrap} flex items-center justify-center`}><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className={wrap}>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <img src="/assets/sll-hub-logo.png" alt="SLL Hub" className="h-7 w-auto object-contain" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <p className="text-xs text-slate-500">Passo {step} de 4: <b className="text-slate-800">{TITLES[step - 1]}</b></p>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
              <div className="h-full rounded-full bg-[#0094eb] transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[11px] font-bold text-slate-500">{pct}%</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pb-32 pt-8">
        <h1 className="mb-6 text-xl font-black text-slate-900">{TITLES[step - 1]}</h1>
        {step === 1 && <StepStoreData data={data} storeId={storeId} onChange={onChange} />}
        {step === 2 && <StepConnection data={data} storeId={storeId} onChange={onChange} />}
        {step === 3 && <StepBrand data={data} storeId={storeId} onChange={onChange} />}
        {step === 4 && <StepSummary data={data} storeId={storeId} busy={busy} onFinish={finish} />}
        {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700">{error}</p>}
      </main>

      <footer className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <button type="button" onClick={back} disabled={step === 1 || busy}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:invisible">
            <ArrowLeft size={14} /> Voltar
          </button>
          <button type="button" onClick={later} disabled={busy} className="cursor-pointer text-[11px] text-slate-400 underline hover:text-slate-600">Configurar mais tarde</button>
          {step < 4 ? (
            <button type="button" onClick={next} disabled={busy}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0094eb] px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">
              {busy ? <Loader2 size={14} className="animate-spin" /> : null} Continuar <ArrowRight size={14} />
            </button>
          ) : <span className="w-24" />}
        </div>
      </footer>
    </div>
  );
}