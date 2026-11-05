import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarClock, Clock, Store, TrendingDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Faixa = 'abaixo' | 'dentro' | 'acima' | 'sem_dados';
type Setor = {
  sector_id: string; setor: string; atualizado_em: string | null; idade_dias: number | null;
  fonte: string | null; incompleto: boolean; anos_historico: number; lojas: number;
};
type Loja = {
  store_id: string; loja: string; setor: string | null; views: number; cliques: number; pedidos: number;
  ctr: number | null; conv: number | null; ticket: number | null;
  ctr_min: number | null; ctr_max: number | null; conv_min: number | null; conv_max: number | null;
  ticket_min: number | null; ticket_max: number | null;
  status_ctr: Faixa; status_conv: Faixa; status_ticket: Faixa;
};
type CronFalha = { job: string; quando: string; status: string; mensagem: string };
type Payload = {
  periodo_dias: number; setores: Setor[]; lojas: Loja[];
  cron: { jobs?: number; ativos?: number; execucoes?: number; ultima?: string | null; erro?: string };
  cron_falhas: CronFalha[]; historico_total: number;
};

const DIAS_DEFASADO = 200;
const COR: Record<Faixa, string> = {
  abaixo: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  dentro: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  acima: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  sem_dados: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};
const ROTULO: Record<Faixa, string> = { abaixo: 'Abaixo', dentro: 'Na faixa', acima: 'Acima', sem_dados: 'Sem dados' };
const CARD = 'rounded-2xl border border-violet-500/30 bg-[#0d1224]';

const num = (v: number | null | undefined, prefixo = '', sufixo = '') =>
  v === null || v === undefined ? '—' : `${prefixo}${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 2 })}${sufixo}`;
const data = (v: string | null | undefined) => (v ? new Date(v).toLocaleDateString('pt-BR') : '—');

function proximaAtualizacao(): Date {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const alvos = [new Date(ano, 0, 2, 9), new Date(ano, 6, 1, 9), new Date(ano + 1, 0, 2, 9)];
  return alvos.find((d) => d > hoje) ?? alvos[2];
}

function Celula(props: { valor: string; faixa: Faixa; ref: string }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="font-semibold text-slate-100">{props.valor}</span>
      <span className={`rounded-full border px-2 py-0.5 text-[11px] ${COR[props.faixa]}`}>{ROTULO[props.faixa]}</span>
      <span className="text-[11px] text-slate-500">{props.ref}</span>
    </div>
  );
}

function Kpi(props: { titulo: string; valor: string; sub: string; icone: React.ReactNode }) {
  return (
    <div className={`${CARD} p-4`}>
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{props.titulo}</span>
        <span className="rounded-lg bg-violet-500/15 p-2 text-violet-300">{props.icone}</span>
      </div>
      <div className="mt-1 text-2xl font-bold text-white">{props.valor}</div>
      <div className="mt-1 text-xs text-slate-500">{props.sub}</div>
    </div>
  );
}

export default function MetricasEtapa4(_props: Record<string, unknown>) {
  const [dias, setDias] = useState<number>(30);
  const [dados, setDados] = useState<Payload | null>(null);
  const [carregando, setCarregando] = useState<boolean>(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    setErro(null);
    supabase.rpc('admin_benchmarks_metrics', { p_days: dias }).then(({ data: d, error }) => {
      if (!ativo) return;
      if (error) setErro(error.message);
      else setDados(d as Payload);
      setCarregando(false);
    });
    return () => { ativo = false; };
  }, [dias]);

  const resumo = useMemo(() => {
    const setores = dados?.setores ?? [];
    const lojas = dados?.lojas ?? [];
    const faixas = (l: Loja) => [l.status_ctr, l.status_conv, l.status_ticket];
    const defasados = setores.filter((s) => (s.idade_dias ?? 9999) > DIAS_DEFASADO);
    const maisAntigo = setores.reduce<Setor | null>((a, s) => ((s.idade_dias ?? 0) > (a?.idade_dias ?? -1) ? s : a), null);
    return {
      defasados,
      maisAntigo,
      incompletos: setores.filter((s) => s.incompleto).length,
      abaixo: lojas.filter((l) => faixas(l).includes('abaixo')).length,
      acima: lojas.filter((l) => faixas(l).includes('acima') && !faixas(l).includes('abaixo')).length,
      semSetor: lojas.filter((l) => !l.setor).length,
    };
  }, [dados]);

  const proxima = proximaAtualizacao();
  const falhas = dados?.cron_falhas ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">Lojas do SLL x médias de mercado do setor, idade dos dados e atualização semestral.</p>
        <div className="flex rounded-lg border border-violet-500/30 p-1">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${dias === d ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'}`}
            >
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {erro && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">Erro ao carregar: {erro}</div>}
      {carregando && !dados && <div className="text-sm text-slate-400">Carregando…</div>}

      {dados && (
        <>
          {(resumo.defasados.length > 0 || falhas.length > 0 || resumo.incompletos > 0 || resumo.semSetor > 0) && (
            <div className="space-y-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
              {resumo.defasados.length > 0 && (
                <div className="flex items-center gap-2"><AlertTriangle size={14} /> {resumo.defasados.length} setor(es) com benchmark com mais de {DIAS_DEFASADO} dias.</div>
              )}
              {resumo.incompletos > 0 && (
                <div className="flex items-center gap-2"><AlertTriangle size={14} /> {resumo.incompletos} setor(es) com faixas incompletas (conversão, CTR ou ticket).</div>
              )}
              {falhas.length > 0 && (
                <div className="flex items-center gap-2"><AlertTriangle size={14} /> {falhas.length} execução(ões) do cron de benchmarks com falha.</div>
              )}
              {resumo.semSetor > 0 && (
                <div className="flex items-center gap-2"><AlertTriangle size={14} /> {resumo.semSetor} loja(s) sem setor definido, sem comparação possível.</div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi titulo="Setores monitorados" valor={String(dados.setores.length)} sub={`${resumo.incompletos} incompleto(s) · ${dados.historico_total} registro(s) no histórico`} icone={<Store size={16} />} />
            <Kpi titulo="Dado mais antigo" valor={resumo.maisAntigo?.idade_dias != null ? `${resumo.maisAntigo.idade_dias} dias` : '—'} sub={resumo.maisAntigo?.setor ?? 'Sem dados'} icone={<Clock size={16} />} />
            <Kpi titulo="Lojas x benchmark" valor={`${resumo.abaixo} abaixo`} sub={`${resumo.acima} acima da faixa do setor`} icone={<TrendingDown size={16} />} />
            <Kpi titulo="Próxima atualização" valor={proxima.toLocaleDateString('pt-BR')} sub={`${dados.cron.ativos ?? 0}/${dados.cron.jobs ?? 0} jobs ativos`} icone={<CalendarClock size={16} />} />
          </div>

          <div className={`${CARD} p-4`}>
            <h3 className="mb-3 text-sm font-bold text-white">Lojas x benchmark do setor ({dias} dias)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Loja</th><th className="pr-4">Setor</th><th className="pr-4">Views</th>
                    <th className="pr-4">CTR em produtos</th><th className="pr-4">Conversão</th><th>Ticket médio</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.lojas.length === 0 && (
                    <tr><td colSpan={6} className="py-6 text-center text-slate-500">Nenhuma loja ativa.</td></tr>
                  )}
                  {dados.lojas.map((l) => (
                    <tr key={l.store_id} className="border-t border-white/5 align-top">
                      <td className="py-3 pr-4 font-medium text-slate-100">{l.loja}</td>
                      <td className="pr-4 text-slate-300">{l.setor ?? 'Sem setor'}</td>
                      <td className="pr-4 text-slate-300">{num(l.views)}</td>
                      <td className="pr-4"><Celula valor={num(l.ctr, '', '%')} faixa={l.status_ctr} ref={`Faixa ${num(l.ctr_min, '', '%')} a ${num(l.ctr_max, '', '%')}`} /></td>
                      <td className="pr-4"><Celula valor={num(l.conv, '', '%')} faixa={l.status_conv} ref={`Faixa ${num(l.conv_min, '', '%')} a ${num(l.conv_max, '', '%')}`} /></td>
                      <td><Celula valor={num(l.ticket, 'R$ ')} faixa={l.status_ticket} ref={`Faixa ${num(l.ticket_min, 'R$ ')} a ${num(l.ticket_max, 'R$ ')}`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">
              CTR = cliques em produtos ÷ views das lives. Conversão = pedidos pagos ÷ views. Com menos de 50 views a loja fica como “Sem dados”.
            </p>
          </div>

          <div className={`${CARD} p-4`}>
            <h3 className="mb-3 text-sm font-bold text-white">Idade dos benchmarks por setor</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-400">
                  <tr>
                    <th className="py-2 pr-4">Setor</th><th className="pr-4">Atualizado em</th><th className="pr-4">Idade</th>
                    <th className="pr-4">Histórico</th><th className="pr-4">Lojas</th><th className="pr-4">Situação</th><th>Fonte</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.setores.map((s) => {
                    const velho = (s.idade_dias ?? 9999) > DIAS_DEFASADO;
                    const faixa: Faixa = s.incompleto || velho ? 'abaixo' : 'dentro';
                    const texto = s.incompleto ? 'Incompleto' : velho ? 'Defasado' : 'Atual';
                    return (
                      <tr key={s.sector_id} className="border-t border-white/5">
                        <td className="py-2 pr-4 font-medium text-slate-100">{s.setor}</td>
                        <td className="pr-4 text-slate-300">{data(s.atualizado_em)}</td>
                        <td className="pr-4 text-slate-300">{s.idade_dias != null ? `${s.idade_dias} dias` : '—'}</td>
                        <td className="pr-4 text-slate-300">{s.anos_historico} ano(s)</td>
                        <td className="pr-4 text-slate-300">{s.lojas}</td>
                        <td className="pr-4"><span className={`rounded-full border px-2 py-0.5 text-[11px] ${COR[faixa]}`}>{texto}</span></td>
                        <td className="max-w-[260px] truncate text-xs text-slate-500" title={s.fonte ?? ''}>{s.fonte ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className={`${CARD} p-4`}>
            <h3 className="mb-3 text-sm font-bold text-white">Atualização semestral (cron)</h3>
            {dados.cron.erro ? (
              <p className="text-sm text-amber-300">Não foi possível ler o cron: {dados.cron.erro}</p>
            ) : (
              <p className="text-sm text-slate-300">
                {dados.cron.ativos ?? 0} de {dados.cron.jobs ?? 0} jobs ativos · {dados.cron.execucoes ?? 0} execução(ões) registrada(s) · última: {data(dados.cron.ultima)}
              </p>
            )}
            {falhas.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">Nenhuma falha registrada nos últimos 400 dias.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {falhas.map((f, i) => (
                  <li key={`${f.job}-${i}`} className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-2 text-xs text-rose-200">
                    <span className="font-semibold">{f.job}</span> · {data(f.quando)} · {f.status}
                    {f.mensagem ? <div className="mt-1 text-rose-300/80">{f.mensagem}</div> : null}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-slate-500">
              “Sucesso” no cron indica só que o disparo da função foi feito. Para ver se um setor foi realmente atualizado, use a coluna Atualizado em.
            </p>
          </div>
        </>
      )}
    </div>
  );
}