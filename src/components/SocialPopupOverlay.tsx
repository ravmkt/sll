import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

const KEY = 'sll_social_popup';

// Calculado na carga do modulo, antes de qualquer limpeza da URL.
// Verdadeiro so na janela aberta pelo botao Conectar, no retorno do login social.
const IS_SOCIAL_POPUP = (() => {
  try {
    const q = new URLSearchParams(window.location.search);
    const oauthReturn = (q.has('code') && q.has('state')) || q.has('tiktok');
    const ts = Number(localStorage.getItem(KEY) || 0);
    return oauthReturn && !!ts && Date.now() - ts < 10 * 60 * 1000;
  } catch { return false; }
})();

export function SocialPopupOverlay() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!IS_SOCIAL_POPUP) return;
    const t = window.setTimeout(() => setSlow(true), 15000);
    return () => window.clearTimeout(t);
  }, []);

  if (!IS_SOCIAL_POPUP) return null;
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-white p-6 text-center">
      <img src="/assets/sll-logotipo.png" alt="SLL Hub" className="h-10 w-auto object-contain" />
      {slow ? (
        <>
          <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          <p className="text-sm font-bold text-slate-700">Pronto. Você já pode fechar esta janela.</p>
          <button type="button" onClick={() => window.close()} className="cursor-pointer rounded-xl bg-[#0094eb] px-5 py-2.5 text-xs font-bold text-white">Fechar janela</button>
        </>
      ) : (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-[#0094eb]" />
          <p className="text-sm font-bold text-slate-700">Conectando sua conta...</p>
          <p className="text-xs text-slate-400">Esta janela fecha sozinha em instantes.</p>
        </>
      )}
    </div>
  );
}