import { useEffect, useState } from 'react';
import { MessageSquare, Percent, PhoneCall, Scissors } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ErrorBox, Metric, card, nf } from '@/components/admin/MetricasUi';
import { periodArgs, useMetricasPeriodo } from '@/components/admin/MetricasPeriodo';

const sb: any = supabase;

type Data = {
  perguntas: number;
  truncadas: number;
  temas: { tema: string; qtd: number }[];
  amostra_outros: { texto: string; quando: string }[];
  quedas_por_tipo: { kind: string; qtd: number }[];
  quedas_por_loja: { loja: string; qtd: number }[];
};

const TEMA: Record<string, string> = {
  'Saudacao': 'Sauda\u00e7\u00e3o',
  'Videos e Stories': 'V\u00eddeos e Stories',
  'Stream Sell': 'Stream Sell',
  'Instalacao e Script': 'Instala\u00e7\u00e3o e Script',
  'Planos e Cobranca': 'Planos e Cobran\u00e7a',
  'Produtos': 'Produtos',
  'Clube SLL': 'Clube SLL',
  'Suporte e prazos': 'Suporte e prazos',
  'Outros': 'Outros',
};
const QUEDA: Record<string, string> = {
  human_request: 'Pediu atendente humano',
  daily_limit: 'Bateu o limite di\u00e1rio',
  cooldown: 'Entrou em respiro (rajada)',
  whatsapp_click: 'Clicou em Chamar no WhatsApp',
};

export default function NoahTemasMetricas() {
  const per = useMetricasPeriodo();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    sb.rpc('admin_noah_themes', periodArgs(per)).then(({ data: d, error: e }: any) => {
      if (!alive) return;
      if (e) setError(e.message);
      else setData(d as Data);
      setLoading(false);
    });
    return () => { alive = false; };
  }, [per.mode, per.days, per.start, per.end]);

  const x = data;
  const dash = loading ? '...' : null;
  const total = x?.perguntas ?? 0;
  const quedas = (x?.quedas_por_tipo ?? []).reduce((a, r) => a + Number(r.qtd), 0);
  const taxa = total > 0 ? ((quedas / total) * 100).toFixed(1).replace('.', ',') + '%' : '-';
  const maxTema = Math.max(1, ...(x?.temas ?? []).map((t) => Number(t.qtd)));
  const th = 'px-3 py-2 text-xs uppercase tracking-wider text-slate-500';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Temas do Noah</h1>
        <p className="mt-0.5 text-[13px] text-slate-500">{'O que os lojistas perguntam e quando o chat precisa levar a conversa para o time.'}</p>
      </div>

      <ErrorBox text={error} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Perguntas" value={dash ?? nf(total)} hint="Que chegaram \u00e0 IA" icon={MessageSquare} tone="bg-sky-500/15 text-sky-300" />
        <Metric label="Quedas para o time" value={dash ?? nf(quedas)} hint="Atendente, limites e WhatsApp" icon={PhoneCall} tone="bg-amber-500/15 text-amber-300" />
        <Metric label="Taxa de queda" value={dash ?? taxa} hint="Quedas \u00f7 perguntas" icon={Percent} tone="bg-violet-500/15 text-violet-300" />
        <Metric label="Respostas cortadas" value={dash ?? nf(x?.truncadas ?? 0)} hint="Chegaram ao limite de tokens" icon={Scissors} tone="bg-rose-500/15 text-rose-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={card}>
          <p className="mb-3 text-[15px] font-bold text-white">Temas das perguntas</p>
          {(x?.temas ?? []).length === 0 ? (
            <p className="text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nenhuma pergunta no per\u00edodo.'}</p>
          ) : (
            <div className="space-y-3">
              {x!.temas.map((t) => (
                <div key={t.tema}>
                  <div className="mb-1 flex justify-between text-[13px] text-slate-300">
                    <span>{TEMA[t.tema] ?? t.tema}</span>
                    <b>{nf(t.qtd)} ({total > 0 ? Math.round((Number(t.qtd) / total) * 100) : 0}%)</b>
                  </div>
                  <div className="h-2 rounded-full bg-slate-800">
                    <div className="h-2 rounded-full bg-[#0094eb]" style={{ width: `${Math.max(3, (Number(t.qtd) / maxTema) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-slate-500">{'Classifica\u00e7\u00e3o por palavras-chave, sem custo de IA. "Outros" mostra o que ainda n\u00e3o tem tema.'}</p>
        </div>

        <div className={card}>
          <p className="mb-3 text-[15px] font-bold text-white">Quedas para o time</p>
          {(x?.quedas_por_tipo ?? []).length === 0 ? (
            <p className="text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nenhuma queda registrada no per\u00edodo.'}</p>
          ) : (
            <table className="w-full text-left text-[13px]">
              <thead><tr className="border-b border-slate-800"><th className={th}>Motivo</th><th className={th + ' text-right'}>Vezes</th></tr></thead>
              <tbody>
                {x!.quedas_por_tipo.map((r) => (
                  <tr key={r.kind} className="border-b border-slate-800/60 last:border-0">
                    <td className="px-3 py-2 text-slate-200">{QUEDA[r.kind] ?? r.kind}</td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-white">{nf(r.qtd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(x?.quedas_por_loja ?? []).length > 0 && (
            <p className="mt-3 text-[12px] text-slate-400">
              {'Lojas com mais quedas: ' + x!.quedas_por_loja.map((l) => l.loja + ' (' + l.qtd + ')').join(', ')}
            </p>
          )}
          <p className="mt-3 text-[11px] text-slate-500">{'Os registros come\u00e7am a partir da aplica\u00e7\u00e3o deste patch. O clique no WhatsApp entra quando o bot\u00e3o do chat for ligado ao registro.'}</p>
        </div>
      </div>

      <div className={card}>
        <p className="mb-3 text-[15px] font-bold text-white">{'Perguntas em "Outros" (mais recentes)'}</p>
        {(x?.amostra_outros ?? []).length === 0 ? (
          <p className="text-[13px] text-slate-500">{loading ? 'Carregando...' : 'Nada sem tema no per\u00edodo.'}</p>
        ) : (
          <ul className="space-y-2">
            {x!.amostra_outros.map((o, i) => (
              <li key={i} className="flex items-center justify-between gap-3 border-b border-slate-800/60 pb-2 text-[13px] last:border-0">
                <span className="truncate text-slate-200">{o.texto}</span>
                <span className="shrink-0 text-slate-500">{new Date(o.quando).toLocaleDateString('pt-BR')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}