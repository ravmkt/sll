import { useLoja } from '@/contexts/LojaContext';
import { useModuleAppEnabled } from '@/hooks/useModuleAppEnabled';
import type { AppModuleKey } from '@/services/moduleAppService';

const HINT: Record<AppModuleKey, { on: string; off: string }> = {
  vidlytics: { on: 'Vídeos online na sua loja', off: 'Vídeos ocultos na sua loja' },
  live_commerce: { on: 'Lives online na sua loja', off: 'Lives ocultas na sua loja' },
};

export default function AppToggle({ moduleKey = 'vidlytics' }: { moduleKey?: AppModuleKey }) {
  const { storeId } = useLoja() as { storeId: string | null };
  const { enabled: on, loading, saving, error, toggle } = useModuleAppEnabled(storeId, moduleKey);

  return (
    <div
      title={error ?? (on ? HINT[moduleKey].on : HINT[moduleKey].off)}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-1.5 transition-colors ${
        error ? 'border-amber-300 bg-amber-50' : on ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70'
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${on ? 'animate-pulse bg-emerald-500' : 'bg-rose-500'}`} />
      <span className={`hidden text-xs font-bold sm:inline ${on ? 'text-emerald-900' : 'text-rose-900'}`}>
        {on ? 'Aplicativo ativado' : 'Aplicativo desativado'}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label="Ativar ou desativar o aplicativo"
        disabled={loading || saving}
        onClick={toggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:cursor-wait disabled:opacity-50 ${on ? 'bg-emerald-500' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}