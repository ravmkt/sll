import { useEffect, useState } from 'react';
import { getNoahUsage, type NoahDaily, type NoahRecent } from '@/services/admin/noahUsage';

const int = (n: number) => new Intl.NumberFormat('pt-BR').format(n);
const dt = (s: string) => new Date(s).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

export default function NoahUsageTab() {
  const [days, setDays] = useState(30);
  const [daily, setDaily] = useState<NoahDaily[]>([]);
  const [recent, setRecent] = useState<NoahRecent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    getNoahUsage(days)
      .then((r) => { if (alive) { setDaily(r.daily); setRecent(r.recent); } })
      .catch((e) => { if (alive) setError(e.message || 'Erro ao carregar'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const questions = daily.reduce((a, d) => a + d.questions, 0);
  const tokens = daily.reduce((a, d) => a + d.total_tokens, 0);
  const truncated = daily.reduce((a, d) => a + d.truncated, 0);
  const pct = questions ? ((truncated / questions) * 100).toFixed(1) : '0.0';
  const maxQ = Math.max(1, ...daily.map((d) => d.questions));

  const kpis = [
    { label: 'Perguntas à IA', value: int(questions) },
    { label: 'Tokens', value: int(tokens) },
    { label: 'Respostas cortadas', value: `${int(truncated)} (${pct}%)` },
    { label: 'Tokens por pergunta', value: int(questions ? Math.round(tokens / questions) : 0) },
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

      {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">{error}. Confirme que a migração 20261020 foi executada.</div>}
      {/* ALERTA_CORTES */}
      {!loading && questions >= 20 && Number(pct) > 5 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
          {pct}% das respostas foram cortadas por limite de tokens (MAX_TOKENS). Considere aumentar o maxOutputTokens do Noah.
        </div>
      )}

      {loading && <div className="text-sm opacity-60">Carregando...</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-lg border border-white/10 p-4">
            <div className="text-xs opacity-60">{k.label}</div>
            <div className="mt-1 text-xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 p-4">
        <div className="mb-3 text-sm font-medium">Perguntas por dia</div>
        <div className="flex h-32 items-end gap-1">
          {daily.map((d) => (
            <div key={d.day} className="group relative flex h-full flex-1 items-end" title={`${d.day}: ${d.questions} perguntas, ${d.truncated} cortadas`}>
              <div className="w-full rounded-t bg-sky-500/60" style={{ height: `${(d.questions / maxQ) * 100}%`, minHeight: 2 }} />
            </div>
          ))}
          {!daily.length && !loading && <div className="text-sm opacity-60">Sem dados no período.</div>}
        </div>
      </div>

      <div className="rounded-lg border border-white/10 p-4">
        <div className="mb-3 text-sm font-medium">Últimas perguntas</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs opacity-60">
              <tr><th className="py-1">Quando</th><th>Loja</th><th>Modelo</th><th>Tokens</th><th>Fim</th><th>Pergunta</th></tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr key={i} className="border-t border-white/5 align-top">
                  <td className="whitespace-nowrap py-1.5 pr-3">{dt(r.created_at)}</td>
                  <td className="pr-3">{r.store_name}</td>
                  <td className="pr-3">{r.model ?? '—'}</td>
                  <td className="pr-3">{int(r.total_tokens)}</td>
                  <td className={`pr-3 ${r.finish_reason === 'MAX_TOKENS' ? 'text-amber-400' : ''}`}>{r.finish_reason ?? '—'}</td>
                  <td className="max-w-[420px] truncate" title={r.user_message ?? ''}>{r.user_message ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}