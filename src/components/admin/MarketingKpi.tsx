import type { MktCoupon } from '@/services/admin/couponsMarketing';
import type { MktItem, MktKind } from '@/services/admin/marketingAdmin';

export type Kpi = { label: string; value: string | number; hint?: string };

const pct = (n: number, d: number) => (d > 0 ? ((n / d) * 100).toFixed(1).replace('.', ',') + '%' : '0,0%');
const sum = (a: number[]) => a.reduce((s, x) => s + (Number(x) || 0), 0);

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((k) => (
        <div key={k.label} className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">{k.label}</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-[#fd8539]">{k.value}</p>
          {k.hint && <p className="mt-1 text-[12px] text-slate-500">{k.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export function Thumb({ url }: { url?: string | null }) {
  if (!url) return <div className="h-12 w-20 shrink-0 rounded-md border border-slate-800 bg-slate-950" />;
  return <img src={url} alt="" className="h-12 w-20 shrink-0 rounded-md border border-slate-700 object-cover" />;
}

export function itemKpis(kind: MktKind, items: MktItem[]): Kpi[] {
  const now = Date.now();
  const live = items.filter((i) =>
    i.is_active &&
    !(i.ends_at && new Date(i.ends_at).getTime() < now) &&
    !(i.starts_at && new Date(i.starts_at).getTime() > now)).length;
  const imp = sum(items.map((i) => i.impressions));
  const clk = sum(items.map((i) => i.clicks));
  const cls = sum(items.map((i) => i.closes));
  if (kind === 'notice') {
    return [
      { label: 'Avisos no ar', value: live },
      { label: 'Impressões', value: imp },
      { label: 'Dispensados', value: cls },
      { label: 'Taxa de fechamento', value: pct(cls, imp), hint: 'Dispensados ÷ impressões' },
    ];
  }
  return [
    { label: kind === 'banner' ? 'Banners no ar' : 'Popups no ar', value: live },
    { label: 'Impressões', value: imp },
    { label: 'Cliques', value: clk },
    { label: 'CTR médio', value: pct(clk, imp), hint: 'Abaixo de 1% o criativo está fraco' },
  ];
}

export function couponKpis(items: MktCoupon[]): Kpi[] {
  const now = Date.now();
  const live = items.filter((c) =>
    c.is_active &&
    !(c.expires_at && new Date(c.expires_at).getTime() < now) &&
    !(c.starts_at && new Date(c.starts_at).getTime() > now) &&
    !(c.max_uses !== null && c.times_used >= c.max_uses)).length;
  const used = sum(items.map((c) => c.times_used));
  const top = [...items].sort((a, b) => b.times_used - a.times_used)[0];
  const limited = items.filter((c) => c.max_uses !== null);
  return [
    { label: 'Cupons no ar', value: live },
    { label: 'Resgates', value: used },
    { label: 'Mais usado', value: top && top.times_used > 0 ? top.code : '—', hint: top && top.times_used > 0 ? top.times_used + ' uso(s)' : undefined },
    {
      label: 'Uso do limite',
      value: pct(sum(limited.map((c) => c.times_used)), sum(limited.map((c) => Number(c.max_uses)))),
      hint: 'Só cupons com limite de usos',
    },
  ];
}