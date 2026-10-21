import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getQuotas, getAutoUsage, type Quota } from '@/services/admin/infraUsageAdmin';
import { getCostSettings } from '@/services/admin/costsAdmin';

const sb: any = supabase;
const STALE_DAYS = 7;

type Man = { value: number; updated_at: string };
type Ai = { calls: number; tokens: number; cost: number; spend: number; projected: number; day: number; days: number };

const LV = {
  green: { bar: 'bg-emerald-500', txt: 'text-emerald-300', label: 'Operação segura' },
  amber: { bar: 'bg-amber-400', txt: 'text-amber-300', label: 'Atenção: consumo elevado' },
  red: { bar: 'bg-rose-500 animate-pulse', txt: 'text-rose-300', label: 'Migração necessária' },
} as const;

const level = (p: number): keyof typeof LV => (p >= 0.9 ? 'red' : p >= 0.75 ? 'amber' : 'green');
const fmt = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function InfraStatusCard() {
  const [quotas, setQuotas] = useState<Quota[] | null>(null);
  const [auto, setAuto] = useState<Record<string, number>>({});
  const [man, setMan] = useState<Record<string, Man>>({});
  const [ai, setAi] = useState<Ai | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const [qs, au, mu, cs, usage] = await Promise.all([
        getQuotas().catch(() => [] as Quota[]),
        getAutoUsage().catch(() => ({} as Record<string, number>)),
        sb.from('infra_usage').select('key,value,updated_at'),
        getCostSettings().catch(() => null),
        sb.rpc('admin_ai_usage', { p_start: ymd(first), p_end: ymd(now) }),
      ]);
      const m: Record<string, Man> = {};
      ((mu?.data as any[]) || []).forEach((r) => { m[r.key] = { value: Number(r.value) || 0, updated_at: r.updated_at }; });
      const calls = Number(usage?.data?.calls) || 0;
      const cost = Number((cs as any)?.ai_cost_brl_per_message) || 0;
      const spend = calls * cost;
      setQuotas(qs);
      setAuto(au || {});
      setMan(m);
      setAi({ calls, tokens: Number(usage?.data?.total_tokens) || 0, cost, spend, projected: (spend / now.getDate()) * days, day: now.getDate(), days });
    })();
  }, []);

  if (!quotas) return <Loader2 className="h-4 w-4 animate-spin text-[#fd8539]" />;

  const rows = quotas.map((q) => {
    const isAuto = q.source === 'auto';
    const used = isAuto ? (auto[q.key] ?? null) : (man[q.key]?.value ?? null);
    const pct = q.included > 0 && used !== null ? used / q.included : null;
    const age = !isAuto && man[q.key] ? Math.floor((Date.now() - new Date(man[q.key].updated_at).getTime()) / 86400000) : null;
    return { q, isAuto, used, pct, age };
  });

  const red = rows.filter((r) => r.pct !== null && r.pct >= 0.9);
  const amber = rows.filter((r) => r.pct !== null && r.pct >= 0.75 && r.pct < 0.9);
  const outdated = rows.filter((r) => !r.isAuto && (r.used === null || (r.age !== null && r.age > STALE_DAYS)));

  const head = red.length
    ? { box: 'border-rose-500/50 bg-rose-500/10', title: 'text-rose-200', text: `Migração necessária: ${red.map((r) => `${r.q.label} (${r.q.service}) em ${Math.round((r.pct as number) * 100)}% da franquia`).join('; ')}. Suba de plano ou reduza o consumo antes de gerar excedente.` }
    : amber.length
      ? { box: 'border-amber-500/40 bg-amber-500/10', title: 'text-amber-200', text: `Atenção: ${amber.map((r) => `${r.q.label} (${r.q.service}) em ${Math.round((r.pct as number) * 100)}%`).join('; ')}. Planeje a migração.` }
      : { box: 'border-emerald-500/40 bg-emerald-500/10', title: 'text-emerald-200', text: 'Todos os serviços dentro da franquia.' };

  return (
    <section className="space-y-4">
      <div className={`rounded-2xl border p-4 ${head.box}`}>
        <p className={`text-base font-black ${head.title}`}>
          Status de Infraestrutura {red.length ? '⚠️' : amber.length ? '·  Atenção' : '· Saudável'}
        </p>
        <p className="mt-1 text-[14px] text-slate-200">{head.text}</p>
        {outdated.length > 0 && (
          <p className="mt-2 text-[13px] text-slate-400">
            Uso manual desatualizado ou não informado: {outdated.map((r) => r.q.label).join(', ')}. Atualize abaixo para o alerta funcionar.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map(({ q, isAuto, used, pct, age }) => {
          const lv = pct === null ? null : LV[level(pct)];
          return (
            <div key={q.key} className="space-y-2 rounded-2xl border border-slate-800 bg-[#111524] p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[14px] font-bold text-white">{q.label}</p>
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-semibold uppercase text-slate-400">{q.service}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div className={`h-full rounded-full ${lv ? lv.bar : 'bg-slate-600'}`} style={{ width: `${Math.min(100, (pct ?? 0) * 100)}%` }} />
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-300">
                  {used === null ? 'Uso não informado' : `${fmt(used)} de ${q.included > 0 ? fmt(q.included) : 'ilimitado'} ${q.unit}`}
                </span>
                {pct !== null && <b className={lv?.txt}>{Math.round(pct * 100)}%</b>}
              </div>
              {pct !== null && pct >= 0.9 && (
                <span className="inline-block rounded-full bg-rose-500/20 px-2 py-0.5 text-xs font-black text-rose-200">
                  MIGRAÇÃO NECESSÁRIA: franquia em {Math.round(pct * 100)}%
                </span>
              )}
              {lv && pct !== null && pct < 0.9 && <p className={`text-xs font-semibold ${lv.txt}`}>{lv.label}</p>}
              <p className="text-xs text-slate-500">
                {isAuto ? 'Leitura automática' : age === null ? 'Uso manual: nunca informado' : `Uso manual: atualizado há ${age} ${age === 1 ? 'dia' : 'dias'}${age > STALE_DAYS ? ' (desatualizado)' : ''}`}
              </p>
            </div>
          );
        })}
      </div>

      {ai && (
        <div className="rounded-2xl border border-slate-800 bg-[#111524] p-4">
          <p className="text-[15px] font-bold text-yellow-300">IA (Noah / Gemini): mês atual</p>
          <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Respostas no mês</p><p className="text-lg font-black text-white">{ai.calls.toLocaleString('pt-BR')}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Custo por resposta</p><p className="text-lg font-black text-white">{money(ai.cost)}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Gasto acumulado</p><p className="text-lg font-black text-emerald-300">{money(ai.spend)}</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Projeção do mês</p><p className="text-lg font-black text-[#fd8539]">{money(ai.projected)}</p></div>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Projeção = gasto até o dia {ai.day} ÷ {ai.day} × {ai.days} dias. Tokens no mês: {ai.tokens.toLocaleString('pt-BR')}.
          </p>
          {ai.cost === 0 && (
            <p className="mt-2 text-[13px] text-amber-300">O custo por resposta (ai_cost_brl_per_message) está em R$ 0,00. Informe o valor para o gasto sair correto.</p>
          )}
        </div>
      )}
    </section>
  );
}