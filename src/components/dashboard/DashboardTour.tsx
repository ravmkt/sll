import { useCallback, useEffect, useState } from 'react';

const STEPS = [
  { sel: '[data-tour="modules"]', title: 'Seu ecossistema de vendas', text: 'Aqui você acessa seus módulos e acompanha os avisos importantes.' },
  { sel: '[data-tour="kpis"]', title: 'Seus números em tempo real', text: 'Veja quantas pessoas interagem com seus vídeos e quanto isso gerou de venda.' },
  { sel: '[data-tour="club"]', title: 'Aprenda e ganhe benefícios', text: 'Assista às aulas de operação e indique colegas para receber comissão todo mês.' },
];

const keyOf = (storeId: string) => `sll_dash_tour:${storeId}`;

export default function DashboardTour({ storeId, createdAt }: { storeId: string; createdAt?: string | null }) {
  const [step, setStep] = useState<number | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!storeId || !createdAt) return;
    const recent = Date.now() - new Date(createdAt).getTime() < 7 * 86400000;
    let seen = false;
    try { seen = localStorage.getItem(keyOf(storeId)) === '1'; } catch { /* segue */ }
    if (recent && !seen) {
      const t = setTimeout(() => setStep(0), 900);
      return () => clearTimeout(t);
    }
  }, [storeId, createdAt]);

  const measure = useCallback(() => {
    if (step === null) return;
    const el = document.querySelector(STEPS[step].sel) as HTMLElement | null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setTimeout(() => setRect(el.getBoundingClientRect()), 350);
  }, [step]);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const finish = () => {
    try { localStorage.setItem(keyOf(storeId), '1'); } catch { /* ignora */ }
    setStep(null);
  };

  if (step === null) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;

  const W = 320;
  const H = 170;
  let left = 16;
  let top = 120;
  if (rect) {
    left = Math.min(Math.max(rect.left, 12), window.innerWidth - W - 12);
    top = rect.bottom + 12;
    if (top + H > window.innerHeight - 8) top = Math.max(8, rect.top - H - 12);
  }

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label={s.title}>
      {rect ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-[#0094eb] transition-all"
          style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12, boxShadow: '0 0 0 9999px rgba(15,23,42,0.6)' }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/60" />
      )}
      <div className="absolute rounded-2xl bg-white p-4 shadow-2xl" style={{ top, left, width: W }}>
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#0094eb]">Passo {step + 1} de {STEPS.length}</p>
        <h3 className="mt-1 text-sm font-black text-slate-900">{s.title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600">{s.text}</p>
        <div className="mt-3 flex items-center justify-between">
          <button type="button" onClick={finish} className="cursor-pointer text-[11px] font-semibold text-slate-400 hover:text-slate-600">Pular tour</button>
          <button
            type="button"
            onClick={() => (last ? finish() : setStep(step + 1))}
            className="cursor-pointer rounded-lg bg-[#0094eb] px-4 py-1.5 text-xs font-bold text-white hover:bg-[#007fcc]"
          >
            {last ? 'Concluir' : 'Próximo'}
          </button>
        </div>
      </div>
    </div>
  );
}