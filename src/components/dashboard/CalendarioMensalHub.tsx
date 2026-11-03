import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { supabaseLiveCommerce } from '@/services/supabaseClients';
import { nextOccurrence, type RuleDate } from '@/lib/commercialOccurrence';
import { useStoreSector } from '@/hooks/useStoreSector';

const sb: any = supabase;
const WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'S\u00e1b'];

type LiveItem = { id: string; title: string; status: string; at: Date };
type Mark = { names: string[]; lives: LiveItem[] };

const hhmm = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

export default function CalendarioMensalHub({ storeId, showLives }: { storeId: string | null; showLives: boolean }) {
  const navigate = useNavigate();
  const sectorId = useStoreSector();
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });
  const [dates, setDates] = useState<RuleDate[] | null>(null);
  const [lives, setLives] = useState<LiveItem[]>([]);

  // Datas comemorativas (mesma regra de segmento do card da direita)
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
        if (alive) setDates((data || []) as RuleDate[]);
      } catch {
        if (alive) setDates([]);
      }
    })();
    return () => { alive = false; };
  }, [sectorId]);

  // Lives agendadas do mes exibido (so se o modulo Stream Sell estiver ativo)
  useEffect(() => {
    if (!storeId || !showLives) { setLives([]); return; }
    let alive = true;
    (async () => {
      try {
        const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
        const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
        const { data, error } = await (supabaseLiveCommerce as any)
          .from('lives')
          .select('id,title,status,scheduled_at')
          .eq('store_id', storeId)
          .in('status', ['scheduled', 'live'])
          .gte('scheduled_at', start.toISOString())
          .lt('scheduled_at', end.toISOString())
          .order('scheduled_at', { ascending: true });
        if (error) throw error;
        const list: LiveItem[] = ((data || []) as any[])
          .filter((r) => r.scheduled_at)
          .map((r) => ({ id: String(r.id), title: String(r.title || 'Live'), status: String(r.status), at: new Date(r.scheduled_at) }));
        if (alive) setLives(list);
      } catch {
        if (alive) setLives([]);
      }
    })();
    return () => { alive = false; };
  }, [storeId, showLives, cursor]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const marks = useMemo(() => {
    const map = new Map<number, Mark>();
    const get = (day: number) => {
      let m = map.get(day);
      if (!m) { m = { names: [], lives: [] }; map.set(day, m); }
      return m;
    };
    (dates || []).forEach((d) => {
      const occ = nextOccurrence(d, new Date(year, month, 1));
      if (occ && occ.getFullYear() === year && occ.getMonth() === month) get(occ.getDate()).names.push(String((d as any).name));
    });
    lives.forEach((l) => get(l.at.getDate()).lives.push(l));
    return map;
  }, [dates, lives, year, month]);

  const lead = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;
  const label = cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const title = label.charAt(0).toUpperCase() + label.slice(1);
  const monthName = cursor.toLocaleDateString('pt-BR', { month: 'long' });

  const go = (delta: number) => setCursor(new Date(year, month + delta, 1));

  const open = (m: Mark) => {
    if (m.lives.length) navigate('/dashboard/modules/stream-sell');
    else navigate('/dashboard/dicas');
  };

  return (
    <div data-tour="calendario-mensal" className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900">{'Calend\u00e1rio do m\u00eas'}</h3>
          <p className="text-sm text-slate-500">
            {showLives ? 'Datas comemorativas e lives agendadas.' : 'Datas comemorativas do seu segmento.'}
          </p>
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
          <CalendarDays className="h-4 w-4" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => go(-1)}
          aria-label={'M\u00eas anterior'}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900">{title}</span>
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => setCursor(new Date(now.getFullYear(), now.getMonth(), 1))}
              className="cursor-pointer rounded-md bg-[#0094eb]/10 px-2 py-0.5 text-[11px] font-bold text-[#0094eb] hover:bg-[#0094eb]/20"
            >
              Hoje
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label={'Pr\u00f3ximo m\u00eas'}
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEK.map((w) => (
          <div key={w} className="py-1 text-center text-[11px] font-bold uppercase tracking-wider text-slate-400">{w}</div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={'b' + idx} className="h-10" />;
          const m = marks.get(day);
          const hasDate = !!m && m.names.length > 0;
          const hasLive = !!m && m.lives.length > 0;
          const isToday = isCurrentMonth && day === now.getDate();
          const col = idx % 7;
          const pos = col <= 1 ? 'left-0' : col >= 5 ? 'right-0' : 'left-1/2 -translate-x-1/2';
          const tone = hasDate
            ? hasLive ? 'bg-amber-50 text-rose-700' : 'bg-amber-50 text-amber-800'
            : hasLive ? 'bg-rose-50 text-rose-700' : 'text-slate-700';
          return (
            <div
              key={day}
              {...(m ? { role: 'button', tabIndex: 0, onClick: () => open(m), onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') open(m); } } : {})}
              className={`group relative flex h-10 items-center justify-center rounded-lg text-sm font-semibold outline-none ${tone} ${
                m ? 'cursor-pointer hover:ring-1 hover:ring-slate-300 focus-visible:ring-2 focus-visible:ring-[#0094eb]' : ''
              } ${isToday ? 'ring-2 ring-[#0094eb]' : ''}`}
            >
              <span>{day}</span>
              {(hasDate || hasLive) && (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {hasDate && <i className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                  {hasLive && <i className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />}
                </span>
              )}
              {m && (
                <span
                  role="tooltip"
                  className={`pointer-events-none absolute bottom-full z-30 mb-2 w-56 rounded-lg bg-[#0f172a] px-3 py-2 text-left text-xs leading-snug text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 ${pos}`}
                >
                  <span className="block font-bold">{`Dia ${day} de ${monthName}`}</span>
                  {m.names.map((n) => (
                    <span key={n} className="mt-1 flex items-start gap-1.5 font-medium">
                      <i className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      {n}
                    </span>
                  ))}
                  {m.lives.map((l) => (
                    <span key={l.id} className="mt-1 flex items-start gap-1.5 font-medium">
                      <i className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                      {`Live: ${l.title} \u00e0s ${hhmm(l.at)}`}
                    </span>
                  ))}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-[11px] font-medium text-slate-500">
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amber-500" />Data comemorativa</span>
        {showLives && <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-[#DC2626]" />Live agendada</span>}
        <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full ring-2 ring-[#0094eb]" />Hoje</span>
      </div>
    </div>
  );
}