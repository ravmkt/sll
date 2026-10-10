import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';

const SKIP = ['/auth', '/admin-master', '/vidlytics', '/planos-bloqueio', '/dashboard/planos', '/dashboard/checkout', '/dashboard/assinaturas', '/sobre', '/privacidade', '/termos'];
const LIVE = ['active', 'lifetime', 'past_due'];

const key = (storeId: string) => `vidlytics_trial_modal_dismissed:${storeId}`;

export default function VidlyticsTrialExpiredModal() {
  const { storeId, store } = useLoja() as { storeId: string | null; store: any };
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const blocked = pathname === '/' || SKIP.some((p) => pathname === p || pathname.startsWith(p + '/'));

  useEffect(() => {
    if (!storeId || blocked) return;
    try { if (localStorage.getItem(key(storeId)) === 'true') return; } catch { /* segue */ }
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
      const covers = (s: any) => s.module_key === 'vidlytics' || s.module_key === 'bundle' || !s.module_key;

      // Assinatura paga que cobre o Vidlytics: nada a avisar
      if (subs.some((s) => covers(s) && LIVE.includes(s.status))) return;

      // Trial do modulo vencido
      const moduleExpired = subs.some((s) => {
        if (s.module_key !== 'vidlytics' || s.status !== 'trialing') return false;
        const end = s.trial_ends_at ?? s.current_period_end;
        return end ? new Date(end).getTime() < now : false;
      });
      // Trial geral da loja vencido (ele incluia o Vidlytics)
      const hasLiveTrial = subs.some((s) => covers(s) && s.status === 'trialing' && new Date(s.trial_ends_at ?? s.current_period_end ?? 0).getTime() >= now);
      const storeExpired =
        store?.subscription_status === 'trialing' && store?.trial_ends_at && new Date(store.trial_ends_at).getTime() < now && !hasLiveTrial;

      if (moduleExpired || storeExpired) setOpen(true);
    })();
    return () => { alive = false; };
  }, [storeId, blocked, store?.subscription_status, store?.trial_ends_at]);

  const dismiss = () => {
    if (storeId) { try { localStorage.setItem(key(storeId), 'true'); } catch { /* ignora */ } }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || blocked) return null;

  return (
    <div className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Teste do Vidlytics encerrado">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 text-center">
        <button type="button" aria-label="Fechar" onClick={dismiss} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="relative mx-auto mb-5 w-20 h-20">
          <div className="w-20 h-20 rounded-2xl bg-[#0094eb]/10 flex items-center justify-center">
            <img src="/assets/vidlytics-logo-ico.png" alt="Vidlytics" className="w-12 h-12 object-contain" onError={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }} />
          </div>
          <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-[#fd8539] border-4 border-white flex items-center justify-center">
            <Clock className="w-4 h-4 text-white" />
          </span>
        </div>

        <h2 className="text-xl font-black text-slate-900 mb-3">Seu teste gratuito do Vidlytics terminou!</h2>
        <p className="text-sm text-slate-600 leading-relaxed mb-6">
          Esperamos que você tenha gostado da experiência. Para manter os vídeos ativos no seu e-commerce e continuar gerando mais vendas, escolha o plano ideal para sua loja.
        </p>

        <button
          type="button"
          onClick={() => { dismiss(); navigate('/dashboard/planos'); }}
          className="w-full py-3 rounded-xl bg-[#fd8539] hover:bg-[#e8742a] text-white text-sm font-bold shadow-lg transition-colors cursor-pointer"
        >
          Ver Planos e Reativar Vídeos
        </button>
        <button type="button" onClick={dismiss} className="mt-4 text-xs font-medium text-slate-400 hover:text-slate-600 underline cursor-pointer">
          Não, obrigado. Quero continuar sem vídeos.
        </button>
      </div>
    </div>
  );
}