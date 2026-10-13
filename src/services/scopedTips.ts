import { supabase } from '@/lib/supabase';
import { isTriggerActive, norm } from '@/lib/tipsMetrics';

const sb: any = supabase;

export interface CtaSource {
  target_module: string | null;
  action_label?: string | null;
  action_url?: string | null;
  cta_active_label: string | null;
  cta_active_url: string | null;
  cta_upgrade_label: string | null;
  cta_upgrade_url: string | null;
}

export interface ScopedTip extends CtaSource {
  id: string;
  title: string;
  content: string;
  scope: string;
  niche: string[];
  sector_ids: string[];
  metric_trigger: any;
}

export type Who = { sectorId?: string | null; niche?: string };

export async function listScopedTips(scope: string): Promise<ScopedTip[]> {
  const { data, error } = await sb.from('tips').select('*').eq('status', true).eq('scope', scope)
    .order('is_featured', { ascending: false }).order('created_at', { ascending: false });
  if (error) return [];
  return (data || []) as ScopedTip[];
}

// Setor (sector_id) manda. Sem sector_ids na dica, vale o nicho antigo como alternativa.
export function tipMatches(t: { sector_ids?: string[] | null; niche?: string[] | null }, who: Who): boolean {
  if (t.sector_ids && t.sector_ids.length) return !!who.sectorId && t.sector_ids.includes(who.sectorId);
  const ns = t.niche || [];
  if (!ns.length || ns.some((x) => norm(x) === 'geral')) return true;
  return !!who.niche && ns.some((x) => norm(x) === norm(who.niche as string));
}

// Prioriza dicas cujo gatilho esta ativo; senao gira entre as demais, uma por dia
export function pickTip(list: ScopedTip[], who: Who, metrics: Record<string, number>, skip = 0): ScopedTip | null {
  const ok = list.filter((t) => tipMatches(t, who));
  const urgent = ok.filter((t) => t.metric_trigger && isTriggerActive(t.metric_trigger, metrics));
  const calm = ok.filter((t) => !t.metric_trigger);
  const pool = urgent.length ? urgent : calm.length ? calm : ok;
  if (!pool.length) return null;
  const day = Math.floor(Date.now() / 86400000);
  return pool[(day + skip) % pool.length];
}

// Dica ligada a um modulo: o CTA muda conforme a loja tenha ou nao o modulo
export function resolveCta(t: CtaSource, owned: string[]): { label: string; url: string } | null {
  if (t.target_module && !owned.includes(t.target_module)) {
    return t.cta_upgrade_label && t.cta_upgrade_url ? { label: t.cta_upgrade_label, url: t.cta_upgrade_url } : null;
  }
  if (t.cta_active_label && t.cta_active_url) return { label: t.cta_active_label, url: t.cta_active_url };
  if (t.action_label && t.action_url) return { label: t.action_label, url: t.action_url };
  return null;
}

export const plainText = (s: string): string =>
  (s || '').replace(/\*\*/g, '').split(/\n{2,}/)[0].replace(/^\s*[-•]\s+/gm, '').replace(/\n/g, ' ').trim();