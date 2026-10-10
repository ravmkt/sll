import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';
import { getCatalogModules } from '@/services/plans/getCatalogShowcase';

const SKIP = ['/auth', '/admin-master', '/vidlytics', '/planos-bloqueio', '/dashboard/planos', '/dashboard/checkout', '/dashboard/assinaturas', '/sobre', '/privacidade', '/termos'];
const LIVE = ['active', 'lifetime', 'past_due'];

type Copy = { text: string; cta: string; skip: string };

// Textos por modulo. Modulo novo sem entrada aqui usa o texto generico (GENERIC).
const COPY: Record<string, Copy> = {
  vidlytics: {
    text: 'Esperamos que você tenha gostado da experiência. Para manter os vídeos ativos no seu e-commerce e continuar gerando mais vendas, escolha o plano ideal para sua loja.',
    cta: 'Ver Planos e Reativar Vídeos',
    skip: 'Não, obrigado. Quero continuar sem vídeos.',
  },
  live_commerce: {
    text: 'Esperamos que você tenha gostado da experiência. Para continuar fazendo lives que vendem direto no seu e-commerce, escolha o plano ideal para sua loja.',
    cta: 'Ver Planos e Reativar Lives',
    skip: 'Não, obrigado. Quero continuar sem lives.',
  },
};
const GENERIC: Copy = {
  text: 'Esperamos que você tenha gostado da experiência. Para continuar usando este módulo e gerar mais vendas, escolha o plano ideal para sua loja.',
  cta: 'Ver Planos e Reativar',
  skip: 'Não, obrigado.',
};

const dismissKey = (storeId: string, mod: string) => `trial_modal_dismissed:${storeId}:${mod}`;
const legacyKey = (storeId: string) => `vidlytics_trial_modal_dismissed:${storeId}`;

const wasDismissed = (storeId: string, mod: string) => {
  try {
    if (localStorage.getItem(dismissKey(storeId, mod)) === 'true') return true;
    if (mod === 'vidlytics' && localStorage.getItem(legacyKey(storeId)) === 'true') return true;
  } catch { /* segue */ }
  return false;
};

type ModInfo = { name: string; logo: string | null };

export default function TrialExpiredModal() {
  const { storeId, store } = useLoja() as { storeId: string | null; store: any };
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [mod, setMod] = useState<string | null>(null);
  const [info, setInfo] = useState<ModInfo | null>(null);
  const [imgFailed, setImgFailed] = useState(false);

  const blocked = pathname === '/' || SKIP.some((p) => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (!storeId || blocked || mod) return;
    let alive = true;
    (async () => {
      const { data } = await (supabase as any)
        .from('subscriptions')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_current', true);
      if (!alive) return;
      const subs: any[] = data || [];
      const now = Date.now();
      const endOf = (s: any) => new Date(s.trial_ends_at ?? s.current_period_end ?? 0).getTime();

      const paidCovers = (m: string) =>
        subs.some((s) => LIVE.includes(s.status) && (s.module_key === m || s.module_key === 'bundle' || !s.module_key));

      const expired = new Set<string>();
      subs.forEach((s) => {
        if (s.status !== 'trialing' || !s.module_key || s.module_key === 'bundle') return;
        if (endOf(s) && endOf(s) < now) expired.add(s.module_key);
      });

      // Trial geral da loja vencido: ele liberava o Vidlytics
      const hasLiveTrial = subs.some(
        (s) => s.status === 'trialing' && (s.module_key === 'vidlytics' || s.module_key === 'bundle' || !s.module_key) && endOf(s) >= now,
      );
      if (
        store?.subscription_status === 'trialing' &&
        store?.trial_ends_at &&
        new Date(store.trial_ends_at).getTime() < now &&
        !hasLiveTrial
      ) {
        expired.add('vidlytics');
      }

      const next = [...expired].find((m) => !paidCovers(m) && !wasDismissed(storeId, m));
      if (next) setMod(next);
    })();
    return () => { alive = false; };
  }, [storeId, blocked, mod, store?.subscription_status, store?.trial_ends_at]);

  // Nome e logo vem do cadastro do modulo (hub_modules)
  useEffect(() => {
    if (!mod) { setInfo(null); setImgFailed(false); return; }
    let alive = true;
    getCatalogModules()
      .then((list: any[]) => {
        if (!alive) return;
        const m = list.find((x) => x.slug === mod);
        const fallback = mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        setInfo({ name: m?.name || fallback, logo: m?.logo_url || null });
      })
      .catch(() => {
        if (alive) setInfo({ name: mod.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), logo: null });
      });
    return () => { alive = false; };
  }, [mod]);

  const dismiss = () => {
    if (storeId && mod) { try { localStorage.setItem(dismissKey(storeId, mod), 'true'); } catch { /* ignora */ } }
    setMod(null);
  };

  useEffect(() => {
    if (!mod) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mod]);

  if (!mod || !info || blocked) return null;

  const copy = COPY[mod] ?? GENERIC;
  const showImg = !!info.logo && !imgFailed;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Teste do ${info.name} encerrado`}>
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <button type="button" aria-label="Fechar" onClick={dismiss} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="relative mx-auto mb-5 w-20 h-20">
          <div className="w-20 h-20 rounded-2xl bg-[#0094eb]/10 flex items-center justify-center">
            {showImg ? (
              <img src={info.logo!} alt={info.name} className="w-12 h-12 object-contain" onError={() => setImgFailed(true)} />
            ) : (
              <span className="text-3xl font-black text-[#0094eb]">{info.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#fd8539] border-4 border-white flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </span>
        </div>

        <h2 className="text-xl font-black text-slate-900 mb-3">Seu teste gratuito do {info.name} terminou!</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">{copy.text}</p>

        <button
          type="button"
          onClick={() => { dismiss(); navigate(`/dashboard/planos?modulo=${mod}`); }}
          className="w-full py-3 rounded-xl bg-[#16a34a] hover:bg-[#15803d] text-white text-sm font-bold shadow-lg transition-colors cursor-pointer"
        >
          {copy.cta}
        </button>
        <button type="button" onClick={dismiss} className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600 underline cursor-pointer">
          {copy.skip}
        </button>
      </div>
    </div>
  );
}