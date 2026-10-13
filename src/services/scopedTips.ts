import { supabase } from '@/lib/supabase';
import { isTriggerActive, norm } from '@/lib/tipsMetrics';

const sb: any = supabase;

export interface ScopedTip {
  id: string;
  title: string;
  content: string;
  scope: string;
  target_module: string | null;
  niche: string[];
  metric_trigger: any;
  action_label: string | null;
  action_url: string | null;
  cta_active_label: string | null;
  cta_active_url: string | null;
  cta_upgrade_label: string | null;
  cta_upgrade_url: string | null;
}

export async function listScopedTips(scope: string): Promise<ScopedTip[]> {
  const { data, error } = await sb.from('tips').select('*').eq('status', true).eq('scope', scope)
    .order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as ScopedTip[];
}

// Prioriza dicas cujo gatilho esta ativo; senao gira entre as demais, uma por dia
export function pickTip(list: ScopedTip[], niche: string, metrics: Record<string, number>, skip = 0): ScopedTip | null {
  const n = norm(niche);
  const ok = list.filter((t) => (t.niche || []).some((x) => norm(x) === 'geral' || (n && norm(x) === n)));
  const urgent = ok.filter((t) => t.metric_trigger && isTriggerActive(t.metric_trigger, metrics));
  const calm = ok.filter((t) => !t.metric_trigger);
  const pool = urgent.length ? urgent : calm.length ? calm : ok;
  if (!pool.length) return null;
  const day = Math.floor(Date.now() / 86400000);
  return pool[(day + skip) % pool.length];
}

// Dica ligada a um modulo: o CTA muda conforme a loja tenha ou nao o modulo
export function resolveCta(t: ScopedTip, owned: string[]): { label: string; url: string } | null {
  if (t.target_module && !owned.includes(t.target_module)) {
    return t.cta_upgrade_label && t.cta_upgrade_url ? { label: t.cta_upgrade_label, url: t.cta_upgrade_url } : null;
  }
  if (t.cta_active_label && t.cta_active_url) return { label: t.cta_active_label, url: t.cta_active_url };
  if (t.action_label && t.action_url) return { label: t.action_label, url: t.action_url };
  return null;
}

export const plainText = (s: string): string =>
  (s || '').replace(/\*\*/g, '').split(/\n{2,}/)[0].replace(/^\s*[-•]\s+/gm, '').replace(/\n/g, ' ').trim();