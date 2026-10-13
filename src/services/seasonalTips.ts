import { supabase } from '@/lib/supabase';
import { nextOccurrence, type RuleDate } from '@/lib/commercialOccurrence';

const sb: any = supabase;
const DAY_MS = 86400000;

export interface SeasonalTip {
  title: string;
  text: string;
  left: number;
  slug: string;
}

const whenLabel = (n: number) => (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`);

// Data comercial do setor da loja que esta dentro da janela de preparo (lead_days)
export async function getSeasonalTip(storeId: string, sectorId?: string | null): Promise<SeasonalTip | null> {
  try {
    let sid: string | null = sectorId ?? null;
    if (!sid) {
      const { data } = await sb.from('stores').select('sector_id').eq('id', storeId).maybeSingle();
      sid = data?.sector_id ?? null;
    }
    let ids: string[] = [];
    const tipMap: Record<string, string> = {};
    if (sid) {
      const [links, tp] = await Promise.all([
        sb.from('commercial_date_sectors').select('commercial_date_id').eq('sector_id', sid),
        sb.from('commercial_date_tips').select('commercial_date_id,tip').eq('sector_id', sid),
      ]);
      ids = (links.data || []).map((r: any) => r.commercial_date_id as string);
      (tp.data || []).forEach((r: any) => { if (r.tip) tipMap[r.commercial_date_id] = r.tip as string; });
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
      if (left <= (d.lead_days ?? 0)) items.push({ d, left });
    }
    items.sort((a, b) => a.left - b.left);
    const first = items[0];
    if (!first) return null;
    const text = tipMap[first.d.id] || first.d.tip || first.d.description;
    if (!text) return null;
    return { title: `${first.d.name}: ${whenLabel(first.left)}`, text, left: first.left, slug: first.d.slug };
  } catch {
    return null;
  }
}