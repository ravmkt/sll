import { useLoja } from '@/contexts/LojaContext';
import { useModuleAppEnabled } from '@/hooks/useModuleAppEnabled';
import type { AppModuleKey } from '@/services/moduleAppService';

export function moduleKeyFromSlug(slug: string): AppModuleKey | null {
  const s = (slug || '').toLowerCase();
  if (s === 'vidlytics') return 'vidlytics';
  if (s.includes('live')) return 'live_commerce';
  return null;
}

const BASE = 'rounded-full px-2.5 py-1 text-xs font-semibold';
const trialText = (n: number) => `Em teste: ${n} ${n === 1 ? 'dia' : 'dias'}`;

function SwitchBadge({ moduleKey, trial }: { moduleKey: AppModuleKey; trial?: number }) {
  const { storeId } = useLoja() as { storeId: string | null };
  const { enabled, loading, saving, toggle } = useModuleAppEnabled(storeId, moduleKey);
  const text = !enabled ? 'Desativado' : trial ? trialText(trial) : 'Ativo';
  const color = !enabled
    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
    : trial
      ? 'bg-[#0094eb]/10 text-[#0094eb] hover:bg-[#0094eb]/20'
      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
  return (
    <button
      type="button"
      disabled={loading || saving}
      onClick={toggle}
      title={enabled ? 'Aplicativo ativo na sua loja. Clique para desativar.' : 'Aplicativo desativado. Clique para ativar.'}
      className={`${BASE} cursor-pointer transition-colors disabled:cursor-wait disabled:opacity-60 ${color}`}
    >
      {'\u2022'} {text}
    </button>
  );
}

export default function ModuleAppBadge({ slug, trial }: { slug: string; trial?: number }) {
  const key = moduleKeyFromSlug(slug);
  if (!key) {
    return (
      <span className={`${BASE} ${trial ? 'bg-[#0094eb]/10 text-[#0094eb]' : 'bg-emerald-50 text-emerald-700'}`}>
        {'\u2022'} {trial ? trialText(trial) : 'Ativo'}
      </span>
    );
  }
  return <SwitchBadge moduleKey={key} trial={trial} />;
}