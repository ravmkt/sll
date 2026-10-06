import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLoja } from '@/contexts/LojaContext';

type CommercialDate = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  tip: string | null;
  rule_type: string;
  month: number | null;
  day: number | null;
  weekday: number | null;
  nth: number | null;
  lead_days: number | null;
};

const DAY_MS = 86400000;
const sb: any = supabase;

function occurrence(d: CommercialDate, year: number): Date | null {
  if (!d.month) return null;
  if (d.rule_type === 'fixed') return d.day ? new Date(year, d.month - 1, d.day) : null;
  if (d.rule_type === 'nth_weekday' && d.weekday !== null && d.nth) {
    const first = new Date(year, d.month - 1, 1);
    const offset = (d.weekday - first.getDay() + 7) % 7;
    const dt = new Date(year, d.month - 1, 1 + offset + (d.nth - 1) * 7);
    return dt.getMonth() === d.month - 1 ? dt : null;
  }
  return null;
}

function nextOccurrence(d: CommercialDate, today: Date): Date | null {
  for (const y of [today.getFullYear(), today.getFullYear() + 1]) {
    const o = occurrence(d, y);
    if (o && o.getTime() >= today.getTime()) return o;
  }
  return null;
}

const whenLabel = (n: number) => (n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : `em ${n} dias`);

export default function ProximasDatasComerciais() {
  const ctx = useLoja() as any;
  const store = ctx?.store;
  const storeId: string | undefined = store?.id ?? ctx?.storeId;
  const [dates, setDates] = useState<CommercialDate[]>([]);
  const [sectorName, setSectorName] = useState('');
  const [filtered, setFiltered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
      try {
        let sid: string | null = store?.sector_id ?? null;
        if (!sid) {
          const { data } = await sb.from('stores').select('sector_id').eq('id', storeId).maybeSingle();
          sid = data?.sector_id ?? null;
        }
        let ids: string[] = [];
        let name = '';
        if (sid) {
          const [links, sec] = await Promise.all([
            sb.from('commercial_date_sectors').select('commercial_date_id').eq('sector_id', sid),
            sb.from('sectors').select('name').eq('id', sid).maybeSingle(),
          ]);
          ids = (links.data || []).map((r: any) => r.commercial_date_id);
          name = sec.data?.name || '';
        }
        let q = sb
          .from('commercial_dates')
          .select('id,slug,name,description,tip,rule_type,month,day,weekday,nth,lead_days')
          .eq('is_active', true);
        if (ids.length) q = q.in('id', ids);
        const { data, error } = await q;
        if (error) throw error;
        if (!alive) return;
        setDates((data || []) as CommercialDate[]);
        setSectorName(name);
        setFiltered(ids.length > 0);
      } catch (err) {
        console.error('[ProximasDatasComerciais]', err);
        if (alive) setDates([]);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [storeId, store?.sector_id]);

  const upcoming = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return dates
      .map((d) => {
        const date = nextOccurrence(d, today);
        return date ? { d, date, left: Math.round((date.getTime() - today.getTime()) / DAY_MS) } : null;
      })
      .filter((x): x is { d: CommercialDate; date: Date; left: number } => !!x)
      .sort((a, b) => a.left - b.left)
      .slice(0, 4);
  }, [dates]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0094eb]/10 flex items-center justify-center shrink-0">
            <CalendarDays className="w-4 h-4 text-[#0094eb]" />
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">Próximas Datas Comerciais</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {filtered && sectorName ? `Setor: ${sectorName}` : 'Datas que movimentam o varejo.'}
            </p>
          </div>
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400">Carregando datas...</p>}
      {!loading && upcoming.length === 0 && <p className="text-xs text-slate-400">Nenhuma data comercial encontrada.</p>}

      <div className="space-y-3">
        {upcoming.map(({ d, date, left }) => {
          const prepare = left <= (d.lead_days ?? 0);
          return (
            <div
              key={d.id}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                prepare ? 'border-[#fd8539]/50 bg-[#fd8539]/5' : 'border-slate-100 hover:bg-slate-50/60'
              }`}
            >
              <div className="w-12 shrink-0 rounded-lg bg-slate-50 border border-slate-100 py-1.5 text-center">
                <p className="text-base font-black leading-none text-slate-800">{String(date.getDate()).padStart(2, '0')}</p>
                <p className="text-[10px] font-bold uppercase text-slate-400 mt-0.5">
                  {date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-800">{d.name}</h4>
                  <span className="text-[10px] font-semibold text-slate-400">{whenLabel(left)}</span>
                  {prepare && (
                    <span className="px-2 py-0.5 rounded-full bg-[#fd8539] text-white text-[10px] font-bold uppercase">
                      Prepare agora
                    </span>
                  )}
                </div>
                {(d.tip || d.description) && (
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{d.tip || d.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}