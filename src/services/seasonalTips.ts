import { supabase } from '@/lib/supabase';
import { nextOccurrence, type RuleDate } from '@/lib/commercialOccurrence';
import { plainText, type CtaSource } from '@/services/scopedTips';

const sb: any = supabase;
const DAY_MS = 86400000;
const MIN_LEAD_DAYS = 45;

export type SeasonalStage = 'plan' | 'produce' | 'urgent';
export type SeasonalScope = 'hub' | 'vidlytics' | 'live_commerce';

export interface SeasonalTip {
  title: string;
  text: string;
  left: number;
  slug: string;
  stage: SeasonalStage;
  source: CtaSource | null;
}

// 45-31 dias: planejar | 30-16: produzir | 15 ou menos: urgencia
export const stageOf = (left: number): SeasonalStage => (left > 30 ? 'plan' : left > 15 ? 'produce' : 'urgent');

const whenLabel = (n: number) => (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`);

export async function getSeasonalTip(
  sectorId: string | null | undefined,
  scope: SeasonalScope = 'hub',
): Promise<SeasonalTip | null> {
  try {
    const sid = sectorId ?? null;
    let ids: string[] = [];
    if (sid) {
      const { data } = await sb.from('commercial_date_sectors').select('commercial_date_id').eq('sector_id', sid);
      ids = (data || []).map((r: any) => r.commercial_date_id as string);
    }
    let q = sb
      .from('commercial_dates')
      .select('id,slug,name,description,tip,rule_type,month,day,weekday,nth,lead_days')
      .eq('is_active', true);
    if (ids.length) q = q.in('id', ids);
    const { data, error } = await q;
    if (error) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const items: { d: RuleDate; left: number }[] = [];
    for (const d of (data || []) as RuleDate[]) {
      const date = nextOccurrence(d, today);
      if (!date) continue;
      const left = Math.round((date.getTime() - today.getTime()) / DAY_MS);
      if (left <= Math.max(d.lead_days ?? 0, MIN_LEAD_DAYS)) items.push({ d, left });
    }
    items.sort((a, b) => a.left - b.left);
    if (!items.length) return null;

    // 1) dica da etapa (por escopo, data e setor)
    const { data: st } = await sb
      .from('commercial_date_stage_tips')
      .select('*')
      .eq('is_active', true)
      .eq('scope', scope)
      .in('commercial_date_id', items.map((i) => i.d.id));
    const rows = (st || []) as any[];
    const day = Math.floor(Date.now() / DAY_MS);
    for (const { d, left } of items) {
      const stage = stageOf(left);
      const cands = rows.filter(
        (r) => r.commercial_date_id === d.id && r.stage === stage && (!r.sector_id || r.sector_id === sid),
      );
      const exact = sid ? cands.filter((r) => r.sector_id === sid) : [];
      const pool = exact.length ? exact : cands;
      if (!pool.length) continue;
      const r = pool[day % pool.length];
      return {
        title: r.title,
        text: plainText(r.content),
        left,
        slug: d.slug,
        stage,
        source: {
          target_module: r.target_module ?? null,
          cta_active_label: r.cta_active_label ?? null,
          cta_active_url: r.cta_active_url ?? null,
          cta_upgrade_label: r.cta_upgrade_label ?? null,
          cta_upgrade_url: r.cta_upgrade_url ?? null,
        },
      };
    }

    // 2) alternativa (so Hub): texto antigo da data para o setor
    if (scope !== 'hub') return null;
    const first = items[0];
    let text: string | null = null;
    if (sid) {
      const { data: tp } = await sb
        .from('commercial_date_tips')
        .select('tip')
        .eq('sector_id', sid)
        .eq('commercial_date_id', first.d.id)
        .maybeSingle();
      text = tp?.tip ?? null;
    }
    text = text || first.d.tip || first.d.description;
    if (!text) return null;
    return {
      title: `${first.d.name}: ${whenLabel(first.left)}`,
      text,
      left: first.left,
      slug: first.d.slug,
      stage: stageOf(first.left),
      source: null,
    };
  } catch {
    return null;
  }
}