import { useEffect, useState } from "react";
import { ThumbsUp, ThumbsDown, BarChart3 } from "lucide-react";
import { getNoahFeedbackMetrics, type NoahFeedbackMetrics } from "@/services/admin/noahMetrics";

const PERIODS = [7, 30, 90];

export default function MetricasPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<NoahFeedbackMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    getNoahFeedbackMetrics(days)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e?.message ?? "Erro ao carregar"); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [days]);

  const up = data?.up ?? 0;
  const down = data?.down ?? 0;
  const total = data?.total ?? 0;
  const approval = total > 0 ? Math.round((up / total) * 100) : null;
  const maxDay = Math.max(1, ...(data?.daily ?? []).map((d) => d.up + d.down));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-slate-700" />
          <h1 className="text-xl font-semibold text-slate-900">Métricas</h1>
        </div>
        <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setDays(p)}
              className={"rounded-md px-3 py-1 text-sm " + (days === p ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100")}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>

      <section className="space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Suporte Noah · Isso ajudou?</h2>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Votos</div>
            <div className="text-2xl font-semibold">{loading ? "…" : total}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-1 text-xs text-slate-500"><ThumbsUp className="h-3.5 w-3.5" /> Curtidas</div>
            <div className="text-2xl font-semibold text-emerald-600">{loading ? "…" : up}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-1 text-xs text-slate-500"><ThumbsDown className="h-3.5 w-3.5" /> Não curtidas</div>
            <div className="text-2xl font-semibold text-red-600">{loading ? "…" : down}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="text-xs text-slate-500">Aprovação</div>
            <div className="text-2xl font-semibold">{loading ? "…" : approval === null ? "—" : approval + "%"}</div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 text-sm font-medium text-slate-700">Votos por dia</div>
          {(data?.daily ?? []).length === 0 ? (
            <div className="text-sm text-slate-500">Nenhum voto no período.</div>
          ) : (
            <div className="flex h-32 items-end gap-1">
              {(data?.daily ?? []).map((d) => (
                <div key={d.day} className="flex flex-1 flex-col justify-end" title={d.day + ": " + d.up + " curtidas, " + d.down + " não curtidas"}>
                  <div className="bg-red-400" style={{ height: (d.down / maxDay) * 100 + "%" }} />
                  <div className="bg-emerald-500" style={{ height: (d.up / maxDay) * 100 + "%" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4 text-sm font-medium text-slate-700">Perguntas que receberam "não curtiu"</div>
          {(data?.downs ?? []).length === 0 ? (
            <div className="p-4 text-sm text-slate-500">Nenhuma no período.</div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-2">Data</th>
                  <th className="px-4 py-2">Loja</th>
                  <th className="px-4 py-2">Pergunta</th>
                </tr>
              </thead>
              <tbody>
                {(data?.downs ?? []).map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="whitespace-nowrap px-4 py-2 text-slate-600">{new Date(r.created_at).toLocaleString("pt-BR")}</td>
                    <td className="px-4 py-2 text-slate-600">{r.store_name ?? r.store_id.slice(0, 8)}</td>
                    <td className="px-4 py-2 text-slate-900">{r.question ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}