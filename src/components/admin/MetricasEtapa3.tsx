import { useEffect, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { Activity, AlertTriangle, Clock, Database, DollarSign, HardDrive, MessageSquare, Percent, Send, ShieldCheck, UserX } from 'lucide-react';
import { supabase } from "@/lib/supabase";
import { rangeArgs, useMetricasPeriodo } from '@/components/admin/MetricasPeriodo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D = any;

const card = 'rounded-2xl border border-violet-500/50 bg-[#111524] p-4';
const n = (v: unknown) => Number(v ?? 0);
const brl = (c: number) => (c / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '-');
const fmtBytes = (b: number) => (b >= 1073741824 ? `${(b / 1073741824).toFixed(1)} GB` : b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);

function useMetric(fn: string, _days?: number) {
  const per = useMetricasPeriodo();
  const [data, setData] = useState<D>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      const res = await supabase.rpc(fn, rangeArgs(per));
      if (!alive) return;
      if (res.error) setError(res.error.message);
      else setData(res.data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [fn, per.start, per.end]);
  return { data, loading, error };
}

function Shell({ title, sub, icon: Icon, error, children }: { title: string; sub: string; icon: ElementType; days?: number; setDays?: (d: number) => void; error: string | null; children: ReactNode }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black text-white"><Icon className="h-6 w-6 text-[#fd8539]" /> {title}</h1>
          <p className="mt-0.5 text-[13px] text-slate-500">{sub}</p>
        </div>
      </div>
      {error && <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 p-3 text-[13px] text-rose-300">{error}</div>}
      {children}
    </div>
  );
}

function Kpi({ label, value, hint, icon: Icon, tone }: { label: string; value: string; hint?: string; icon: ElementType; tone: string }) {
  return (
    <div className={`${card} flex items-start justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-[13px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-black text-white">{value}</p>
        {hint && <p className="mt-0.5 text-[13px] text-slate-500">{hint}</p>}
      </div>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></div>
    </div>
  );
}

type Row = { label: string; value: number; extra?: string };

function BarList({ title, rows, fmt, empty, hint }: { title: string; rows: Row[]; fmt?: (v: number) => string; empty: string; hint?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className={card}>
      <p className="mb-3 text-[15px] font-bold text-white">{title}</p>
      {rows.length === 0 ? (
        <p className="text-[13px] text-slate-500">{empty}</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.label}>
              <div className="flex justify-between gap-3 text-[13px]">
                <span className="truncate text-slate-300">{r.label}</span>
                <span className="shrink-0 font-semibold text-white">{fmt ? fmt(r.value) : r.value}{r.extra ? <span className="ml-2 font-normal text-slate-500">{r.extra}</span> : null}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-800"><div className="h-1.5 rounded-full bg-[#0094eb]" style={{ width: `${Math.max(2, (r.value / max) * 100)}%` }} /></div>
            </div>
          ))}
        </div>
      )}
      {hint && <p className="mt-3 text-[13px] text-slate-500">{hint}</p>}
    </div>
  );
}

function DataTable({ title, head, rows, empty, hint }: { title: string; head: string[]; rows: ReactNode[][]; empty: string; hint?: string }) {
  return (
    <div className={card}>
      <p className="mb-3 text-[15px] font-bold text-white">{title}</p>
      {rows.length === 0 ? (
        <p className="text-[13px] text-slate-500">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-500">
                {head.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-slate-800/60 last:border-0">
                  {r.map((c, j) => <td key={j} className="px-3 py-2 text-slate-200">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {hint && <p className="mt-3 text-[13px] text-slate-500">{hint}</p>}
    </div>
  );
}

export function ReceitaMetricas() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useMetric('admin_receita_metrics', days);
  const d: D = data ?? {};
  const dash = loading ? '...' : null;
  const te = n(d.trial_ended);
  const tc = n(d.trial_converted);
  const pastDue: D[] = d.past_due ?? [];
  const toRows = (a: D[] | undefined, val: string, extra?: (x: D) => string): Row[] => (a ?? []).map((x) => ({ label: String(x.key), value: n(x[val]), extra: extra ? extra(x) : undefined }));
  return (
    <Shell title={'Receita'} sub={'Trial, receita por plano e m\u00f3dulo, add-ons, cancelamentos e inadimpl\u00eancia.'} icon={DollarSign} days={days} setDays={setDays} error={error}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={'Receita paga'} value={dash ?? brl(n(d.revenue_cents))} hint={'Faturas pagas no per\u00edodo'} icon={DollarSign} tone="bg-emerald-500/15 text-emerald-300" />
        <Kpi label={'Convers\u00e3o do trial'} value={dash ?? pct(tc, te)} hint={`${tc} de ${te} trials encerrados`} icon={Percent} tone="bg-sky-500/15 text-sky-300" />
        <Kpi label={'Dias at\u00e9 converter'} value={dash ?? (d.avg_days_to_convert == null ? '-' : String(d.avg_days_to_convert))} hint={'Cadastro at\u00e9 o 1\u00ba pagamento'} icon={Clock} tone="bg-violet-500/15 text-violet-300" />
        <Kpi label={'Inadimplentes'} value={dash ?? String(pastDue.length)} hint={'Assinaturas em atraso'} icon={AlertTriangle} tone="bg-rose-500/15 text-rose-300" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title={'Receita por m\u00f3dulo'} rows={toRows(d.by_module, 'cents', (x) => `${x.n} fatura(s)`)} fmt={brl} empty={'Nenhuma fatura paga no per\u00edodo.'} />
        <BarList title={'Receita por tipo (plano avulso ou combo)'} rows={toRows(d.by_kind, 'cents', (x) => `${x.n} fatura(s)`)} fmt={brl} empty={'Nenhuma fatura paga no per\u00edodo.'} />
        <BarList title={'Add-ons recorrentes ativos (por m\u00f3dulo)'} rows={toRows(d.addons, 'cents', (x) => `${x.qty} un.`)} fmt={brl} empty={'Nenhum add-on ativo.'} hint={'Valor mensal das assinaturas ativas, sem filtro de per\u00edodo.'} />
        <BarList title={'Cancelamentos por m\u00f3dulo'} rows={toRows(d.churn_by_module, 'n')} empty={'Nenhum cancelamento no per\u00edodo.'} hint={'O motivo do cancelamento ainda n\u00e3o \u00e9 registrado: falta uma coluna e uma pergunta no fluxo de cancelamento.'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable title={'Faturas n\u00e3o pagas por status'} head={['Status', 'Faturas', 'Valor']} rows={(d.unpaid_by_status ?? []).map((x: D) => [String(x.status), String(x.n), brl(n(x.cents))])} empty={'Nenhuma fatura em aberto no per\u00edodo.'} />
        <DataTable title={'Lojas com pagamento em atraso'} head={['Loja', 'Dias']} rows={pastDue.map((x) => [String(x.name), String(x.days)])} empty={'Nenhuma loja em atraso.'} />
      </div>
    </Shell>
  );
}

export function ComunicacaoMetricas() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useMetric('admin_comunicacao_metrics', days);
  const d: D = data ?? {};
  const dash = loading ? '...' : null;
  const total = n(d.total);
  const failed = n(d.failed);
  const leads = n(d.leads_total);
  const optout = n(d.optout);
  return (
    <Shell title={'Comunica\u00e7\u00e3o'} sub={'Disparos de WhatsApp e e-mail das lives, falhas, opt-out e conex\u00f5es.'} icon={MessageSquare} days={days} setDays={setDays} error={error}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={'Enviadas'} value={dash ?? String(total)} hint={'Registros no per\u00edodo'} icon={Send} tone="bg-sky-500/15 text-sky-300" />
        <Kpi label={'Falhas'} value={dash ?? String(failed)} hint={`Taxa ${pct(failed, total)}`} icon={AlertTriangle} tone="bg-rose-500/15 text-rose-300" />
        <Kpi label={'Opt-out'} value={dash ?? pct(optout, leads)} hint={`${optout} de ${leads} leads`} icon={UserX} tone="bg-amber-500/15 text-amber-300" />
        <Kpi label={'WhatsApp ativo'} value={dash ?? String(n(d.whatsapp_enabled))} hint={`${n(d.email_enabled)} loja(s) com e-mail ativo`} icon={MessageSquare} tone="bg-emerald-500/15 text-emerald-300" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <BarList title={'Por canal e status'} rows={(d.by_channel ?? []).map((x: D) => ({ label: `${x.channel} \u00b7 ${x.status}`, value: n(x.n) }))} empty={'Nenhum envio no per\u00edodo.'} />
        <BarList title={'Por gatilho'} rows={(d.by_trigger ?? []).map((x: D) => ({ label: String(x.trg), value: n(x.n), extra: `${x.failed} falha(s)` }))} empty={'Nenhum envio no per\u00edodo.'} hint={'Mostra o volume de cada lembrete (24h, 1h, in\u00edcio da live).'} />
        <BarList title={'Conex\u00f5es de WhatsApp por status'} rows={(d.connections ?? []).map((x: D) => ({ label: String(x.status), value: n(x.n) }))} empty={'Nenhuma loja com WhatsApp ativo.'} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable title={'Erros mais frequentes'} head={['Erro', 'Vezes']} rows={(d.top_errors ?? []).map((x: D) => [String(x.error), String(x.n)])} empty={'Nenhum erro no per\u00edodo.'} />
        <DataTable title={'WhatsApp ativo e n\u00e3o conectado'} head={['Loja', 'Status']} rows={(d.disconnected ?? []).map((x: D) => [String(x.name), String(x.status)])} empty={'Todas as conex\u00f5es ativas est\u00e3o conectadas.'} />
      </div>
    </Shell>
  );
}

export function SaudeMetricas() {
  const [days, setDays] = useState(30);
  const { data, loading, error } = useMetric('admin_saude_metrics', days);
  const d: D = data ?? {};
  const dash = loading ? '...' : null;
  const stores = n(d.stores_total);
  const ok = n(d.script_ok);
  const cron: D[] = d.cron ?? [];
  return (
    <Shell title={'Sa\u00fade t\u00e9cnica'} sub={'Script nas lojas, tarefas agendadas, vendas gravadas e uso de banco e armazenamento.'} icon={Activity} days={days} setDays={setDays} error={error}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label={'Script verificado'} value={dash ?? pct(ok, stores)} hint={`${ok} de ${stores} lojas`} icon={ShieldCheck} tone="bg-emerald-500/15 text-emerald-300" />
        <Kpi label={'Sem atividade h\u00e1 7+ dias'} value={dash ?? String(n(d.inactive_7d))} hint={'Lojas com assinatura ativa'} icon={AlertTriangle} tone="bg-amber-500/15 text-amber-300" />
        <Kpi label={'Banco de dados'} value={dash ?? fmtBytes(n(d.db_size_bytes))} icon={Database} tone="bg-violet-500/15 text-violet-300" />
        <Kpi label={'Armazenamento de v\u00eddeos'} value={dash ?? fmtBytes(n(d.storage_used))} icon={HardDrive} tone="bg-sky-500/15 text-sky-300" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <DataTable title={'Tarefas agendadas (cron)'} head={['Tarefa', 'Execu\u00e7\u00f5es', 'Falhas', '\u00daltima falha']} rows={cron.map((x) => [String(x.job), String(x.runs), String(x.fails), x.last_fail ? new Date(x.last_fail).toLocaleString('pt-BR') : '-'])} empty={'Sem execu\u00e7\u00f5es no per\u00edodo.'} hint={'Falhas de Edge Functions chamadas pelo cron aparecem aqui.'} />
        <BarList title={'Vendas gravadas (sll_conversions)'} rows={(d.conv_by ?? []).map((x: D) => ({ label: `${x.module} \u00b7 ${x.status}`, value: n(x.n), extra: brl(n(x.total) * 100) }))} empty={'Nenhuma venda gravada no per\u00edodo.'} hint={d.conv_last ? `\u00daltima venda: ${new Date(d.conv_last).toLocaleString('pt-BR')}` : 'Recebidos x gravados dos webhooks ainda n\u00e3o t\u00eam tabela de registro.'} />
        <DataTable title={'Assinantes sem script ap\u00f3s 48h'} head={['Loja', 'Dias']} rows={(d.paying_no_script ?? []).map((x: D) => [String(x.name), String(x.days)])} empty={'Todas as lojas ativas t\u00eam o script verificado.'} />
        <DataTable title={'Lojas perto do limite de armazenamento'} head={['Loja', 'Uso']} rows={(d.storage_near ?? []).map((x: D) => [String(x.name), `${x.pct}%`])} empty={'Nenhuma loja acima de 80%.'} hint={'Vers\u00e3o do script e erros de CORS ainda n\u00e3o s\u00e3o registrados no banco.'} />
      </div>
    </Shell>
  );
}