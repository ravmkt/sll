import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Radio, X } from 'lucide-react';

// Para trocar o aviso: altere o id (reaparece para todos) e os textos.
const NOTICE = {
  id: 'live-commerce-2026-10',
  badge: 'NOVO',
  title: 'Conheça o Live Commerce do SLL Hub',
  text: 'Transmita ao vivo direto na sua loja, com produtos vinculados e chat em tempo real.',
  cta: 'Ver como funciona',
  to: '/dashboard/planos?modulo=live_commerce',
};

export default function DashboardNotice() {
  const navigate = useNavigate();
  const key = `sll_notice_dismissed:${NOTICE.id}`;
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try { setHidden(localStorage.getItem(key) === '1'); } catch { setHidden(false); }
  }, [key]);

  const close = () => {
    try { localStorage.setItem(key, '1'); } catch { /* ignora */ }
    setHidden(true);
  };

  if (hidden) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#0b3a5c] p-6 shadow-sm">
      <button
        type="button"
        onClick={close}
        aria-label="Fechar aviso"
        className="absolute right-3 top-3 cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0 max-w-xl space-y-3 pr-6">
          <span className="inline-block rounded-full bg-[#0094eb] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">{NOTICE.badge}</span>
          <h2 className="text-xl font-black leading-tight text-white">{NOTICE.title}</h2>
          <p className="text-sm leading-relaxed text-slate-300">{NOTICE.text}</p>
          <button
            type="button"
            onClick={() => navigate(NOTICE.to)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#007fcc]"
          >
            {NOTICE.cta} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="hidden shrink-0 sm:block">
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl border border-white/10 bg-white/5">
            <Radio className="h-12 w-12 text-[#0094eb]" />
            <span className="absolute -bottom-2 rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white">Ao vivo</span>
          </div>
        </div>
      </div>
    </div>
  );
}