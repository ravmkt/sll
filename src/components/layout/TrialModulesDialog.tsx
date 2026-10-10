import { useNavigate } from 'react-router-dom';
import { Clock, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCatalogModules } from '@/services/plans/getCatalogShowcase';
import type { useModuleTrials } from '@/hooks/useModuleTrials';

type Trial = ReturnType<typeof useModuleTrials>['trials'][number];

const whenLabel = (t: Trial) => {
  if (t.expired) return 'Vencido';
  const endsToday = !!t.endsAt && new Date(t.endsAt).toDateString() === new Date().toDateString();
  if (endsToday || t.daysLeft <= 0) return 'Vence hoje';
  if (t.daysLeft === 1) return 'Vence amanhã';
  return `Vence em ${t.daysLeft} dias`;
};

export default function TrialModulesDialog({ trials, onClose }: { trials: Trial[]; onClose: () => void }) {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    getCatalogModules().then((l: any[]) => { if (alive) setCatalog(l || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const go = (path: string) => { onClose(); navigate(path); };
  const sorted = [...trials].sort((a, b) => Number(a.expired) - Number(b.expired) || a.daysLeft - b.daysLeft);

  return (
    <div className="fixed inset-0 z-[120] bg-black/60 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Módulos em teste">
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8">
        <button type="button" aria-label="Fechar" onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black text-slate-900 mb-1">Seus módulos em teste</h2>
        <p className="text-sm text-slate-600 mb-5">Assine só o que você quer manter ou veja todos os planos de uma vez.</p>

        <div className="space-y-3 max-h-[55vh] overflow-y-auto">
          {sorted.map((t) => {
            const m = catalog.find((x) => x.slug === t.moduleKey);
            const urgent = t.expired || t.daysLeft <= 1;
            return (
              <div key={t.moduleKey} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-[#0094eb]/10 flex items-center justify-center">
                  {m?.logo_url ? (
                    <img src={m.logo_url} alt={m?.name || t.label} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-lg font-black text-[#0094eb]">{(m?.name || t.label || '?').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">{m?.name || t.label}</p>
                  <p className={`text-xs font-semibold flex items-center gap-1 ${urgent ? 'text-red-600' : 'text-slate-500'}`}>
                    <Clock className="w-3 h-3" /> {whenLabel(t)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => go(`/dashboard/planos?modulo=${t.moduleKey}`)}
                  className="shrink-0 px-3 py-2 rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold cursor-pointer"
                >
                  Assinar este módulo
                </button>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => go('/dashboard/planos')}
          className="mt-5 w-full py-3 rounded-xl border-2 border-[#0094eb] text-[#0094eb] hover:bg-[#0094eb]/5 text-sm font-bold cursor-pointer"
        >
          Ver todos os planos
        </button>
      </div>
    </div>
  );
}
