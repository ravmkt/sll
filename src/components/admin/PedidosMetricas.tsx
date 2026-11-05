import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Lightbulb, Loader2, RefreshCw, ThumbsUp } from 'lucide-react';
import IdeasAdmin from '@/components/admin/IdeasAdmin';
import { STATUS_LABEL, STATUS_ORDER, adminList as adminListAll } from '@/services/requests';
import { useMetricasPeriodo, ymd as ymdLocal } from '@/components/admin/MetricasPeriodo';

let periodoPedidos = { start: '', end: '' };
const adminList = async (...a: Parameters<typeof adminListAll>) => {
  const res: any = await (adminListAll as any)(...a);
  if (!Array.isArray(res) || !periodoPedidos.start) return res;
  return res.filter((r: any) => {
    const d = ymdLocal(new Date(r.created_at));
    return d >= periodoPedidos.start && d <= periodoPedidos.end;
  });
};

const COLORS: Record<string, string> = {
  received: '#94a3b8', review: '#f59e0b', planned: '#0ea5e9', dev: '#8b5cf6', done: '#10b981',
};
const CARD = 'rounded-2xl border border-white/10 bg-[#111524] p-5';
const TIP = { background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0', fontSize: 12 };
const nf = (n: number) => new Intl.NumberFormat('pt-BR').format(n);

function PedidosMetricasBase() {
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    setErr('');
    try {
      setRows(((await adminList()) as any[]) || []);
    } catch (e: any) {
      setErr(e?.message || 'Erro ao carregar os pedidos.');
      setRows([]);
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const data = useMemo(() => {
    const list = (rows || []).filter((r) => !r.hidden);
    const byStatus = STATUS_ORDER.map((s: string) => ({
      key: s, name: (STATUS_LABEL as any)[s] || s, value: list.filter((r) => r.status === s).length,
    }));
    const mod: Record<string, number> = {};
    list.forEach((r) => { const m = String(r.module || 'Geral'); mod[m] = (mod[m] || 0) + 1; });
    const byModule = Object.entries(mod).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
    const top = [...list].filter((r) => r.status !== 'done').sort((a, b) => (Number(b.votes) || 0) - (Number(a.votes) || 0)).slice(0, 5);
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return { k: d.getFullYear() + '-' + d.getMonth(), name: d.toLocaleDateString('pt-BR', { month: 'short' }), value: 0 };
    });
    list.forEach((r) => {
      const d = new Date(r.created_at);
      const m = months.find((x) => x.k === d.getFullYear() + '-' + d.getMonth());
      if (m) m.value++;
    });
    const week = Date.now() - 7 * 86400000;
    return {
      total: list.length,
      novos: list.filter((r) => new Date(r.created_at).getTime() >= week).length,
      abertos: list.filter((r) => r.status === 'received' || r.status === 'review').length,
      andamento: list.filter((r) => r.status === 'planned' || r.status === 'dev').length,
      feitos: list.filter((r) => r.status === 'done').length,
      votos: list.reduce((a, r) => a + (Number(r.votes) || 0), 0),
      byStatus, byModule, top, months,
    };
  }, [rows]);

  const kpis = [
    { l: 'Pedidos', v: data.total },
    { l: 'Novos (7 dias)', v: data.novos },
    { l: 'Aguardando análise', v: data.abertos },
    { l: 'Planejado / em dev', v: data.andamento },
    { l: 'Concluídos', v: data.feitos },
    { l: 'Votos', v: data.votos },
  ];

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            <Lightbulb className="h-4 w-4 text-[#fd8539]" /> {'Pedidos dos lojistas'}
          </h2>
          <p className="text-xs text-slate-500">{'O que as lojas pedem. Altere o status na tabela abaixo; os gráficos atualizam em seguida.'}</p>
        </div>
        <button type="button" onClick={() => void load()} className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-white/15">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />} Atualizar
        </button>
      </div>

      {err && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{err}</div>}

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.l} className={CARD}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{k.l}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-white">{rows ? nf(k.v) : '...'}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className={CARD}>
          <p className="mb-2 text-sm font-bold text-white">Por status</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.byStatus} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {data.byStatus.map((s: any) => <Cell key={s.key} fill={COLORS[s.key] || '#64748b'} />)}
                </Pie>
                <Tooltip contentStyle={TIP} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
            {data.byStatus.map((s: any) => (
              <span key={s.key} className="inline-flex items-center gap-1">
                <i className="h-2 w-2 rounded-full" style={{ background: COLORS[s.key] || '#64748b' }} />{s.name} ({s.value})
              </span>
            ))}
          </div>
        </div>

        <div className={CARD}>
          <p className="mb-2 text-sm font-bold text-white">{'Pedidos por mês'}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.months}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={28} />
                <Tooltip contentStyle={TIP} cursor={{ fill: 'rgba(255,255,255,.05)' }} />
                <Bar dataKey="value" name="Pedidos" fill="#0094eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={CARD}>
          <p className="mb-2 text-sm font-bold text-white">{'Por módulo'}</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.byModule} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={90} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip contentStyle={TIP} cursor={{ fill: 'rgba(255,255,255,.05)' }} />
                <Bar dataKey="value" name="Pedidos" fill="#fd8539" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className={CARD}>
        <p className="mb-3 text-sm font-bold text-white">{'Mais votados (ainda não concluídos)'}</p>
        {data.top.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum pedido em aberto.</p>
        ) : (
          <ul className="space-y-2">
            {data.top.map((r: any) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 px-3 py-2">
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0094eb]/15 px-2.5 py-1 text-xs font-black text-[#38bdf8]">
                  <ThumbsUp className="h-3 w-3" /> {Number(r.votes) || 0}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200" title={r.title}>{r.title}</span>
                <span className="shrink-0 text-[11px] text-slate-500">{r.module}</span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: COLORS[r.status] || '#64748b' }}>
                  {(STATUS_LABEL as any)[r.status] || r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div onChangeCapture={() => setTimeout(() => void load(), 900)}>
        <IdeasAdmin />
      </div>
    </section>
  );
}

export default function PedidosMetricas() {
  const per = useMetricasPeriodo();
  periodoPedidos = { start: per.start, end: per.end };
  return <PedidosMetricasBase key={per.start + per.end} />;
}