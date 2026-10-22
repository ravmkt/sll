import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { nextOccurrence, type RuleDate } from '@/lib/commercialOccurrence';
import { stageOf, type SeasonalStage } from '@/services/seasonalTips';
import { useStoreSector } from '@/hooks/useStoreSector';

const sb: any = supabase;
const DAY_MS = 86400000;
const WINDOW_DAYS = 60;
const MAX_ITEMS = 5;

type Row = { id: string; name: string; tip: string; date: Date; left: number; stage: SeasonalStage };

const STAGE: Record<SeasonalStage, { label: string; cls: string }> = {
  plan: { label: 'Planejar', cls: 'bg-sky-50 text-sky-700' },
  produce: { label: 'Produzir', cls: 'bg-amber-50 text-amber-700' },
  urgent: { label: 'Urgente', cls: 'bg-rose-50 text-rose-700' },
};

const whenLabel = (n: number) => (n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : `Em ${n} dias`);

export default function CalendarioComercialHub() {
  const navigate = useNavigate();
  const sectorId = useStoreSector();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (sectorId === undefined) return;
    let alive = true;
    (async () => {
      try {
        let ids: string[] = [];
        if (sectorId) {
          const { data } = await sb.from('commercial_date_sectors').select('commercial_date_id').eq('sector_id', sectorId);
          ids = (data || []).map((r: any) => r.commercial_date_id as string);
        }
        let q = sb
          .from('commercial_dates')
          .select('id,slug,name,description,tip,rule_type,month,day,weekday,nth,lead_days')
          .eq('is_active', true);
        if (ids.length) q = q.in('id', ids);
        const { data, error } = await q;
        if (error) throw error;

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const out: Row[] = [];
        for (const d of (data || []) as RuleDate[]) {
          const date = nextOccurrence(d, today);
          if (!date) continue;
          const left = Math.round((date.getTime() - today.getTime()) / DAY_MS);
          if (left < 0 || left > WINDOW_DAYS) continue;
          const any = d as any;
          out.push({ id: String(any.id), name: String(any.name), tip: String(any.tip || any.description || ''), date, left, stage: stageOf(left) });
        }
        out.sort((a, b) => a.left - b.left);
        if (alive) setRows(out.slice(0, MAX_ITEMS));
      } catch {
        if (alive) setRows([]);
      }
    })();
    return () => { alive = false; };
  }, [sectorId]);

  return (
    <div data-tour="calendar" className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">Datas comemorativas</h3>
          <p className="text-sm text-slate-500">Próximos {WINDOW_DAYS} dias, de acordo com o segmento da sua loja.</p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        {rows === null ? (
          [0, 1, 2].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />)
        ) : rows.length === 0 ? (
          <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600">
            Nenhuma data comercial relevante nos próximos {WINDOW_DAYS} dias.
          </p>
        ) : (
          rows.map((r, i) => (
            <button
              key={r.id}
              type="button"
              title={r.tip}
              onClick={() => navigate('/dashboard/dicas')}
              className={`group flex flex-1 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all hover:border-[#0094eb]/40 hover:bg-slate-50 ${
                i === 0 ? 'border-[#0094eb]/30 bg-sky-50/50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
                <span className="text-base font-black leading-none">{String(r.date.getDate()).padStart(2, '0')}</span>
                <span className="text-[10px] font-bold uppercase leading-tight">
                  {r.date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-900">{r.name}</p>
                <p className="truncate text-xs font-medium text-slate-500">{whenLabel(r.left)}</p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STAGE[r.stage].cls}`}>
                {STAGE[r.stage].label}
              </span>
            </button>
          ))
        )}
      </div>

      <button
        type="button"
        onClick={() => navigate('/dashboard/dicas')}
        className="inline-flex cursor-pointer items-center gap-1.5 self-end text-xs font-bold text-[#0094eb] hover:underline"
      >
        Ver dicas e insights <ArrowRight className="h-3 w-3" />
      </button>
    </div>
  );
}