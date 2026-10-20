import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CARD, SELECT } from '@/components/admin/moduleUi';
import { brlCents, type ModulesRevenue, type StoreOpt } from '@/services/admin/modulesRevenue';

const COLORS = ['#fd8539', '#0094eb', '#22c55e', '#a855f7', '#facc15', '#ef4444', '#14b8a6', '#ec4899'];

const pd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function buildBuckets(data: ModulesRevenue): string[] {
  const out: string[] = [];
  const end = pd(data.to);
  const c = pd(data.from);
  if (data.group === 'month') {
    c.setDate(1);
    while (c <= end) { out.push(ymd(c)); c.setMonth(c.getMonth() + 1); }
  } else {
    while (c <= end) { out.push(ymd(c)); c.setDate(c.getDate() + 1); }
  }
  return out;
}

const label = (b: string, g: 'day' | 'month') =>
  g === 'month'
    ? pd(b).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    : pd(b).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

function Kpi({ title, value, accent, hint }: { title: string; value: string; accent?: boolean; hint?: string }) {
  return (
    <div className={CARD}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <p className={`mt-1 text-xl font-black ${accent ? 'text-[#fd8539]' : 'text-white'}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-600">{hint}</p>}
    </div>
  );
}

export default function RevenueSection({
  data, loading, stores, store, onStore,
}: {
  data: ModulesRevenue | null;
  loading: boolean;
  stores: StoreOpt[];
  store: string;
  onStore: (v: string) => void;
}) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const items = data?.items ?? [];
  const bks = useMemo(() => (data ? buildBuckets(data) : []), [data]);
  const vals = useMemo(() => {
    const m = new Map<string, number>();
    (data?.series ?? []).forEach((r) => m.set(`${r.item_key}|${r.bucket}`, Number(r.cents) || 0));
    return m;
  }, [data]);

  const visible = items.filter((i) => !hidden.has(i.item_key));
  const lines = visible.map((it) => ({ it, v: bks.map((b) => vals.get(`${it.item_key}|${b}`) ?? 0) }));
  const max = Math.max(1, ...lines.flatMap((l) => l.v));

  const W = 800, H = 220, PL = 8, PR = 8, PT = 12, PB = 24;
  const n = bks.length;
  const xs = (i: number) => (n <= 1 ? W / 2 : PL + (i * (W - PL - PR)) / (n - 1));
  const ys = (v: number) => PT + (H - PT - PB) * (1 - v / max);

  const toggle = (k: string) =>
    setHidden((p) => { const x = new Set(p); if (x.has(k)) x.delete(k); else x.add(k); return x; });
  const preset = (mode: 'all' | 'modules' | 'combos') =>
    setHidden(new Set(items.filter((i) => (mode === 'modules' ? i.is_combo : mode === 'combos' ? !i.is_combo : false)).map((i) => i.item_key)));

  const total = Number(data?.revenue_total) || 0;
  const payers = Number(data?.paying_stores) || 0;
  const arpu = payers > 0 ? Math.round(total / payers) : 0;
  const pill = 'cursor-pointer rounded-full px-3 py-1 text-xs font-bold';

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold text-white">Receita do período</h2>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />}
          <select value={store} onChange={(e) => onStore(e.target.value)} className={`${SELECT} cursor-pointer`}>
            <option value="">Todas as lojas (visão global)</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <Kpi title="Receita módulos" value={brlCents(data?.revenue_modules ?? 0)} />
        <Kpi title="Receita combos" value={brlCents(data?.revenue_combos ?? 0)} />
        <Kpi title="Receita total" value={brlCents(total)} accent />
        <Kpi title="Ticket médio por loja (ARPU)" value={brlCents(arpu)} hint={`${payers} loja(s) pagante(s) no período`} />
      </div>

      <div className={`${CARD} space-y-3`}>
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-2 text-[13px] font-bold text-slate-300">Evolução ({data?.group === 'month' ? 'mensal' : 'diária'})</p>
          <button type="button" onClick={() => preset('all')} className={`${pill} bg-white/5 text-slate-300 hover:bg-white/10`}>Todos</button>
          <button type="button" onClick={() => preset('modules')} className={`${pill} bg-white/5 text-slate-300 hover:bg-white/10`}>Só módulos</button>
          <button type="button" onClick={() => preset('combos')} className={`${pill} bg-white/5 text-slate-300 hover:bg-white/10`}>Só combos</button>
          <span className="mx-1 h-4 w-px bg-slate-700" />
          {items.map((it, idx) => {
            const on = !hidden.has(it.item_key);
            const color = COLORS[idx % COLORS.length];
            return (
              <button key={it.item_key} type="button" onClick={() => toggle(it.item_key)}
                className={`${pill} flex items-center gap-1.5 border ${on ? 'border-transparent bg-white/10 text-white' : 'border-slate-700 text-slate-500'}`}>
                <span className="h-2 w-2 rounded-full" style={{ background: on ? color : '#475569' }} />
                {it.is_combo ? `Combo ${it.item_label}` : it.item_label}
              </button>
            );
          })}
        </div>

        {items.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-slate-500">Sem receita paga no período.</p>
        ) : (
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
            <line x1={PL} x2={W - PR} y1={H - PB} y2={H - PB} stroke="#334155" />
            <line x1={PL} x2={W - PR} y1={PT} y2={PT} stroke="#1e293b" strokeDasharray="4 4" />
            <text x={PL} y={PT - 2} fontSize="10" fill="#64748b">{brlCents(max)}</text>
            {[0, Math.floor((n - 1) / 2), n - 1].filter((v, i, a) => n > 0 && a.indexOf(v) === i).map((i) => (
              <text key={i} x={xs(i)} y={H - 6} fontSize="10" fill="#64748b" textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>
                {label(bks[i], data!.group)}
              </text>
            ))}
            {lines.map(({ it, v }) => {
              const color = COLORS[items.indexOf(it) % COLORS.length];
              return (
                <g key={it.item_key}>
                  {n > 1 && <polyline fill="none" stroke={color} strokeWidth="2" points={v.map((y, i) => `${xs(i)},${ys(y)}`).join(' ')} />}
                  {v.map((y, i) => (
                    <circle key={i} cx={xs(i)} cy={ys(y)} r={n > 40 ? 2 : 3} fill={color}>
                      <title>{`${it.item_label} · ${label(bks[i], data!.group)}: ${brlCents(y)}`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </section>
  );
}