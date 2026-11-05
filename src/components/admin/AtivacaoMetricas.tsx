import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useMetricasPeriodo } from '@/components/admin/MetricasPeriodo';

type Etapa = { key: string; n: number; dias: number | null };
type Travada = { id: string; name: string | null; created_at: string; next: string | null };
type Data = { total: number; etapas: Etapa[]; travadas: Travada[] };

const T_TITULO = 'Ativa\u00e7\u00e3o';
const T_SUB = 'Lojas cadastradas no per\u00edodo (sem lojas de teste) e at\u00e9 onde chegaram.';
const T_FUNIL = 'Funil de ativa\u00e7\u00e3o';
const T_TRAV = 'Lojas travadas (mais de 48h sem avan\u00e7ar)';
const T_VAZIO = 'Nenhuma loja cadastrada no per\u00edodo.';
const T_SEM_TRAV = 'Nenhuma loja travada.';
const T_PASSO = 'Pr\u00f3ximo passo';
const T_CAD = 'Cadastro';
const T_DIAS = 'dias at\u00e9 aqui (m\u00e9dia)';

const LABEL: Record<string, string> = {
  cadastro: 'Cadastro',
  onboarding: 'Onboarding conclu\u00eddo',
  script: 'Script verificado',
  video: 'Primeiro v\u00eddeo',
  live: 'Primeira live realizada',
  venda: 'Primeira venda paga',
};
const NEXT: Record<string, string> = {
  onboarding: 'Concluir o onboarding',
  script: 'Verificar o script',
  video: 'Subir o primeiro v\u00eddeo',
  live: 'Realizar a primeira live',
  venda: 'Fazer a primeira venda',
};

const card = 'rounded-2xl border border-violet-500/50 bg-[#111524] p-4';

export default function AtivacaoMetricas() {
  const per = useMetricasPeriodo();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    supabase.rpc('admin_ativacao_metrics', { p_start: per.start, p_end: per.end }).then(({ data: d, error: e }) => {
      if (!alive) return;
      if (e) setError(e.message);
      else setData(d as unknown as Data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [per.start, per.end]);

  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[13px] font-bold uppercase tracking-wider text-violet-400">{T_TITULO}</h2>
        <p className="mt-0.5 text-[13px] text-slate-500">{T_SUB}</p>
      </div>

      {error && <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-3 text-[13px] text-rose-300">{error}</div>}

      <div className={card}>
        <p className="mb-3 text-[15px] font-bold text-white">{T_FUNIL}</p>
        {loading ? (
          <p className="text-[13px] text-slate-500">...</p>
        ) : total === 0 ? (
          <p className="text-[13px] text-slate-500">{T_VAZIO}</p>
        ) : (
          <div className="space-y-3">
            {(data?.etapas ?? []).map((e) => {
              const pct = Math.round((e.n / total) * 100);
              return (
                <div key={e.key}>
                  <div className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="font-semibold text-slate-200">{LABEL[e.key] ?? e.key}</span>
                    <span className="text-slate-400">
                      <b className="text-white">{e.n}</b> de {total} · {pct}%
                      {e.dias !== null && e.dias !== undefined ? ` · ${e.dias} ${T_DIAS}` : ''}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-[#fd8539]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className={card}>
        <p className="mb-3 text-[15px] font-bold text-white">{T_TRAV}</p>
        {loading ? (
          <p className="text-[13px] text-slate-500">...</p>
        ) : (data?.travadas ?? []).length === 0 ? (
          <p className="text-[13px] text-slate-500">{T_SEM_TRAV}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="text-slate-500">
                  <th className="py-2 pr-4 font-bold">Loja</th>
                  <th className="py-2 pr-4 font-bold">{T_CAD}</th>
                  <th className="py-2 font-bold">{T_PASSO}</th>
                </tr>
              </thead>
              <tbody>
                {(data?.travadas ?? []).map((t) => (
                  <tr key={t.id} className="border-t border-slate-800 text-slate-200">
                    <td className="py-2 pr-4 font-semibold">{t.name || t.id.slice(0, 8)}</td>
                    <td className="py-2 pr-4">{new Date(t.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="py-2">{t.next ? NEXT[t.next] ?? t.next : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}