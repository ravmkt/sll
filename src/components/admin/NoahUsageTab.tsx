import { useEffect, useMemo, useState } from 'react';
import { getNoahUsage, type NoahByModel, type NoahDaily, type NoahPrice, type NoahRecent } from '@/services/admin/noahUsage';
import { useFxRate } from '@/hooks/admin/useFxRate';

const int = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
const brl4 = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);
const dt = (s: string) => new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
const dm = (s: string) => `${s.slice(8, 10)}/${s.slice(5, 7)}`;

export default function NoahUsageTab() {
  const [days, setDays] = useState(30);
  const [daily, setDaily] = useState<NoahDaily[]>([]);
  const [recent, setRecent] = useState<NoahRecent[]>([]);
  const [byModel, setByModel] = useState<NoahByModel[]>([]);
  const [prices, setPrices] = useState<NoahPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { rate } = useFxRate();
  const fx = rate ?? 5.5;

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getNoahUsage(days)
      .then((r) => {
        if (!alive) return;
        setDaily(r.daily); setRecent(r.recent); setByModel(r.byModel); setPrices(r.prices);
      })
      .catch((e) => { if (alive) setError(e.message || 'Erro ao carregar'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const priceMap = useMemo(() => new Map(prices.map((p) => [p.model, p])), [prices]);
  const costUsd = (model: string | null, p: number, c: number): number | null => {
    const x = model ? priceMap.get(model) : undefined;
    return x ? (p / 1e6) * x.input_usd + (c / 1e6) * x.output_usd : null;
  };

  const questions = daily.reduce((a, d) => a + d.questions, 0);
  const tokens = daily.reduce((a, d) => a + d.total_tokens, 0);
  const truncated = daily.reduce((a, d) => a + d.truncated, 0);
  const pct = questions ? ((truncated / questions) * 100).toFixed(1) : '0.0';
  const maxQ = Math.max(1, ...daily.map((d) => d.questions));
  const totalUsd = byModel.reduce((a, m) => a + (costUsd(m.model, m.prompt_tokens, m.completion_tokens) ?? 0), 0);
  const costPerQuestion = questions ? (totalUsd * fx) / questions : 0;

  const kpis = [
    { label: 'Perguntas à IA', value: int(questions) },
    { label: 'Tokens', value: int(tokens) },
    { label: 'Respostas cortadas', value: `${int(truncated)} (${pct}%)` },
    { label: 'Tokens por pergunta', value: int(questions ? Math.round(tokens / questions) : 0) },
    { label: 'Custo no período', value: brl4(totalUsd * fx) },
    { label: 'Custo por pergunta', value: brl4(costPerQuestion) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Uso do Noah</h2>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-md border border-white/10 bg-transparent px-3 py-1.5 text-sm"
        >
          <option value={7}>7 dias</option>
          <option value={30}>30 dias</option>
          <option value={90}>90 dias</option>
        </select>
      </div>

      {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}. Confirme que a migração 20261201 foi executada.</div>}
      {/* ALERTA_CORTES */}
      {!loading && questions >= 20 && Number(pct) > 5 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
          {pct}% das respostas foram cortadas por limite de tokens (MAX_TOKENS). Considere aumentar o maxOutputTokens do Noah.
        </div>
      )}

      {loading && <div className="text-sm opacity-60">Carregando...</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-white/10 p-4">
            <div className="text-xs opacity-60">{k.label}</div>
            <div className="mt-1 text-xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 p-4">
        <h3 className="mb-3 text-sm font-semibold">Perguntas por dia</h3>
        <div className="flex h-40 items-stretch gap-1">
          {daily.map((d) => (
            <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col" title={`${dm(d.day)}: ${d.questions} perguntas, ${d.truncated} cortadas`}>
              <div className="relative flex-1">
                <div className="absolute bottom-0 w-full rounded-t bg-[#0094eb]/70" style={{ height: `${(d.questions / maxQ) * 100}%` }} />
                <span className="absolute w-full text-center text-[11px] font-semibold text-slate-200" style={{ bottom: `calc(${(d.questions / maxQ) * 100}% + 2px)` }}>
                  {d.questions}
                </span>
              </div>
              {daily.length <= 15 && <span className="mt-1 text-center text-[11px] text-slate-500">{dm(d.day)}</span>}
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 p-4">
        <h3 className="mb-3 text-sm font-semibold">Custo por modelo no período <span className="font-normal opacity-60">(US$ 1 = R$ {fx.toFixed(2).replace('.', ',')})</span></h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs opacity-60">
              <tr><th className="py-1">Modelo</th><th>Perguntas</th><th>Entrada</th><th>Saída</th><th>Custo (US$)</th><th>Custo (R$)</th></tr>
            </thead>
            <tbody>
              {byModel.map((m) => {
                const u = costUsd(m.model, m.prompt_tokens, m.completion_tokens);
                return (
                  <tr key={m.model} className="border-t border-white/5">
                    <td className="py-1.5 pr-3">{m.model}</td>
                    <td className="pr-3">{int(m.questions)}</td>
                    <td className="pr-3">{int(m.prompt_tokens)}</td>
                    <td className="pr-3">{int(m.completion_tokens)}</td>
                    <td className="pr-3">{u === null ? 'sem preço' : `$${u.toFixed(4)}`}</td>
                    <td className="pr-3">{u === null ? '—' : brl4(u * fx)}</td>
                  </tr>
                );
              })}
              {byModel.length === 0 && <tr><td colSpan={6} className="py-2 opacity-60">Sem dados no período.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-white/10 p-4">
        <h3 className="mb-3 text-sm font-semibold">Últimas perguntas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs opacity-60">
              <tr><th className="py-1">Quando</th><th>Loja</th><th>Modelo</th><th>Tokens</th><th>Custo (R$)</th><th>Fim</th><th>Pergunta</th></tr>
            </thead>
            <tbody>
              {recent.map((r, i) => {
                const u = costUsd(r.model, r.prompt_tokens, r.completion_tokens);
                return (
                  <tr key={i} className="border-t border-white/5 align-top">
                    <td className="whitespace-nowrap py-1.5 pr-3">{dt(r.created_at)}</td>
                    <td className="pr-3">{r.store_name}</td>
                    <td className="pr-3">{r.model ?? '—'}</td>
                    <td className="pr-3" title={`Entrada ${int(r.prompt_tokens)} · Saída ${int(r.completion_tokens)}`}>{int(r.total_tokens)}</td>
                    <td className="whitespace-nowrap pr-3">{u === null ? '—' : brl4(u * fx)}</td>
                    <td className={`pr-3 ${r.finish_reason === 'MAX_TOKENS' ? 'text-amber-400' : ''}`}>{r.finish_reason ?? '—'}</td>
                    <td className="max-w-[420px] truncate" title={r.user_message ?? ''}>{r.user_message ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}