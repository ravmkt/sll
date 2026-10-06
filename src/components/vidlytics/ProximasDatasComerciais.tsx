import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Lightbulb, X } from 'lucide-react';
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

type Tip = { tip: string; period_label: string | null };
type Item = { d: CommercialDate; date: Date; left: number };

const DAY_MS = 86400000;
const sb: any = supabase;

function easter(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}

function occurrence(d: CommercialDate, year: number): Date | null {
  if (d.rule_type === 'easter_offset') {
    const e = easter(year);
    e.setDate(e.getDate() + (d.day ?? 0));
    return e;
  }
  if (!d.month) return null;
  if (d.rule_type === 'fixed') return d.day ? new Date(year, d.month - 1, d.day) : null;
  if ((d.rule_type === 'nth_weekday' || d.rule_type === 'thanksgiving_offset') && d.weekday !== null && d.nth) {
    const first = new Date(year, d.month - 1, 1);
    const offset = (d.weekday - first.getDay() + 7) % 7;
    const dt = new Date(year, d.month - 1, 1 + offset + (d.nth - 1) * 7);
    if (dt.getMonth() !== d.month - 1) return null;
    if (d.rule_type === 'thanksgiving_offset') dt.setDate(dt.getDate() + (d.day ?? 0));
    return dt;
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
  const [tips, setTips] = useState<Record<string, Tip>>({});
  const [sectorName, setSectorName] = useState('');
  const [filtered, setFiltered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Item | null>(null);

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
        const tipMap: Record<string, Tip> = {};
        if (sid) {
          const [links, sec, tp] = await Promise.all([
            sb.from('commercial_date_sectors').select('commercial_date_id').eq('sector_id', sid),
            sb.from('sectors').select('name').eq('id', sid).maybeSingle(),
            sb.from('commercial_date_tips').select('commercial_date_id,tip,period_label').eq('sector_id', sid),
          ]);
          ids = (links.data || []).map((r: any) => r.commercial_date_id);
          name = sec.data?.name || '';
          (tp.data || []).forEach((r: any) => {
            tipMap[r.commercial_date_id] = { tip: r.tip, period_label: r.period_label };
          });
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
        setTips(tipMap);
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

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSelected(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected]);

  const upcoming = useMemo<Item[]>(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return dates
      .map((d) => {
        const date = nextOccurrence(d, today);
        return date ? { d, date, left: Math.round((date.getTime() - today.getTime()) / DAY_MS) } : null;
      })
      .filter((x): x is Item => !!x)
      .sort((a, b) => a.left - b.left)
      .slice(0, 6);
  }, [dates]);

  const selTip = selected ? tips[selected.d.id] : undefined;
  const selText = selected ? selTip?.tip || selected.d.tip || selected.d.description : null;

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
              {filtered && sectorName ? `Setor: ${sectorName} · clique para ver a dica` : 'Clique em uma data para ver a dica de ação.'}
            </p>
          </div>
        </div>
      </div>

      {loading && <p className="text-xs text-slate-400">Carregando datas...</p>}
      {!loading && upcoming.length === 0 && <p className="text-xs text-slate-400">Nenhuma data comercial encontrada.</p>}

      <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
        {upcoming.map((it) => {
          const { d, date, left } = it;
          const prepare = left <= (d.lead_days ?? 0);
          return (
            <button
              type="button"
              key={d.id}
              onClick={() => setSelected(it)}
              className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                prepare ? 'border-[#fd8539]/50 bg-[#fd8539]/5 hover:bg-[#fd8539]/10' : 'border-slate-100 hover:bg-slate-50/60'
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
                <p className="text-[11px] text-[#0094eb] font-semibold mt-0.5 flex items-center gap-1">
                  <Lightbulb className="w-3 h-3" /> Ver dica de ação comercial
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white shadow-xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
              <div className="min-w-0">
                <h3 className="text-base font-black text-slate-800">{selected.d.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">
                  {selected.date.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                    {whenLabel(selected.left)}
                  </span>
                  {selected.left <= (selected.d.lead_days ?? 0) && (
                    <span className="px-2 py-0.5 rounded-full bg-[#fd8539] text-white text-[10px] font-bold uppercase">
                      Prepare agora
                    </span>
                  )}
                  {selTip?.period_label && (
                    <span className="text-[10px] font-semibold text-slate-400">Período: {selTip.period_label}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Fechar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-[#0094eb]">
                <Lightbulb className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Dica de ação comercial</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {selText || 'Ainda não há uma dica cadastrada para esta data.'}
              </p>
              {sectorName && <p className="text-[11px] text-slate-400">Sugestão para o setor: {sectorName}</p>}
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="w-full py-2.5 rounded-xl bg-[#0094eb] hover:bg-[#0082d0] text-white text-xs font-bold transition-colors"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}