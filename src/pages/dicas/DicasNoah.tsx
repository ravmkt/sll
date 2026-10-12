import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Clock, Lightbulb, Search, Store, Tag, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useLoja } from '@/contexts/LojaContext';
import { useDashboardData } from '@/components/dashboard/useDashboardData';
import { CATEGORIES, categoryLabel, isTriggerActive, norm } from '@/lib/tipsMetrics';
import { listActiveTips, listFeedback, saveFeedback, type Tip, type TipFeedback } from '@/services/tipsService';
import { showError } from '@/utils/toast';

const NOAH_SQUARE = '/assets/dica-do-noah-logo-quadrado.png';
const CARD = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md';

const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function NoahImg({ className, fallback }: { className: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return <img src={NOAH_SQUARE} alt="Noah" className={className} onError={() => setFailed(true)} />;
}

const inline = (s: string): ReactNode[] =>
  s.split(/(\*\*[^*]+\*\*)/g).map((p, i) =>
    p.length > 4 && p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>,
  );

function Rich({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-2 text-sm leading-relaxed text-slate-700">
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        const isList = lines.every((l) => /^\s*[-•]\s+/.test(l));
        if (isList) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*[-•]\s+/, ''))}</li>)}
            </ul>
          );
        }
        return <p key={i}>{inline(lines.join(' '))}</p>;
      })}
    </div>
  );
}

function TipCard({ tip, fb, urgent, onDone, onVote, onAction }: {
  tip: Tip; fb?: TipFeedback; urgent: boolean;
  onDone: () => void; onVote: (v: 1 | -1) => void; onAction: () => void;
}) {
  const done = !!fb?.implemented;
  return (
    <article className={`${CARD} flex flex-col gap-3 p-5 ${urgent ? 'border-[#fd8539]/60 bg-[#fd8539]/5' : ''} ${done ? 'opacity-70' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {urgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#fd8539] px-2.5 py-0.5 text-[10px] font-black uppercase text-white">
              <AlertTriangle className="h-3 w-3" /> Oportunidade detectada
            </span>
          )}
          <span className="rounded-full bg-[#0094eb]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0094eb]">{categoryLabel(tip.category)}</span>
        </div>
        {tip.estimated_minutes && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
            <Clock className="h-3 w-3" /> Ação de {tip.estimated_minutes} min
          </span>
        )}
      </div>

      <h3 className="text-base font-black text-slate-900">{tip.title}</h3>
      <Rich text={tip.content} />

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2">
        {tip.action_url && tip.action_label ? (
          <button type="button" onClick={onAction} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#007fcc]">
            {tip.action_label} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : <span />}
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Útil" onClick={() => onVote(1)}
            className={`cursor-pointer rounded-lg border p-1.5 ${fb?.vote === 1 ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-slate-200 text-slate-400 hover:text-slate-700'}`}>
            <ThumbsUp className="h-3.5 w-3.5" />
          </button>
          <button type="button" aria-label="Não útil" onClick={() => onVote(-1)}
            className={`cursor-pointer rounded-lg border p-1.5 ${fb?.vote === -1 ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-400 hover:text-slate-700'}`}>
            <ThumbsDown className="h-3.5 w-3.5" />
          </button>
          <button type="button" onClick={onDone}
            className={`inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold ${done ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:text-slate-800'}`}>
            <Check className="h-3.5 w-3.5" /> {done ? 'Implementado' : 'Marcar como implementado'}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function DicasNoah() {
  const navigate = useNavigate();
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };
  const range = useMemo(() => {
    const now = new Date();
    const s = new Date(now);
    s.setDate(s.getDate() - 29);
    return { start: ymd(s), end: ymd(now) };
  }, []);
  const { data, loading: metricsLoading } = useDashboardData(storeId, range);

  const [tips, setTips] = useState<Tip[]>([]);
  const [fbMap, setFbMap] = useState<Record<string, TipFeedback>>({});
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [onlyPending, setOnlyPending] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    Promise.all([listActiveTips(), listFeedback(storeId)])
      .then(([t, f]) => {
        if (!alive) return;
        setTips(t);
        setFbMap(Object.fromEntries(f.map((x) => [x.tip_id, x])));
      })
      .catch((e) => showError((e as Error).message))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [storeId]);

  const niche: string = store?.store_niche || '';
  const metrics = useMemo(() => ({
    ctr: data.ctrRange, views: data.viewsRange, clicks: data.clicksRange, revenue: data.assistedRevenue,
    products: data.products, videos: data.totalVideos, referred: data.referred,
  }), [data]);

  const mine = useMemo(() => tips.filter((t) =>
    (t.niche || []).some((n) => norm(n) === 'geral' || (niche && norm(n) === norm(niche))),
  ), [tips, niche]);

  const active = (t: Tip) => !metricsLoading && isTriggerActive(t.metric_trigger, metrics);

  const filtered = useMemo(() => {
    const s = norm(q);
    return mine.filter((t) =>
      (cat === 'all' || t.category === cat) &&
      (!s || norm(t.title).includes(s) || norm(t.content).includes(s)) &&
      (!onlyPending || !fbMap[t.id]?.implemented),
    );
  }, [mine, cat, q, onlyPending, fbMap]);

  const priority = filtered.filter(active);
  const feed = filtered.filter((t) => !active(t));
  const priorityCount = mine.filter((t) => active(t) && !fbMap[t.id]?.implemented).length;

  const update = async (tip: Tip, patch: Partial<TipFeedback>) => {
    if (!storeId) return;
    const prev = fbMap[tip.id] ?? { tip_id: tip.id, implemented: false, vote: null };
    const next: TipFeedback = { ...prev, ...patch };
    setFbMap((m) => ({ ...m, [tip.id]: next }));
    try { await saveFeedback(storeId, next); }
    catch (e) { setFbMap((m) => ({ ...m, [tip.id]: prev })); showError((e as Error).message); }
  };

  const go = (tip: Tip) => {
    const url = tip.action_url;
    if (!url) return;
    if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
    else navigate(url);
  };

  const clear = () => { setCat('all'); setQ(''); setOnlyPending(false); };
  const render = (t: Tip, urgent: boolean) => (
    <TipCard key={t.id} tip={t} fb={fbMap[t.id]} urgent={urgent}
      onDone={() => update(t, { implemented: !fbMap[t.id]?.implemented })}
      onVote={(v) => update(t, { vote: fbMap[t.id]?.vote === v ? null : v })}
      onAction={() => go(t)} />
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <button type="button" onClick={() => navigate('/dashboard')} className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#0094eb]">
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Dashboard
        </button>

        <div className="flex items-center gap-4">
          <NoahImg className="h-16 w-16 shrink-0 rounded-2xl object-contain" fallback={<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0094eb]/10"><Lightbulb className="h-8 w-8 text-[#0094eb]" /></div>} />
          <div>
            <h1 className="text-2xl font-black text-slate-900">Dicas & Insights do Noah</h1>
            <p className="text-sm text-slate-600">Recomendações práticas e acionáveis para destravar as vendas e a margem da sua loja.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700"><Store className="h-3.5 w-3.5 text-[#0094eb]" /> {store?.name || 'Sua loja'}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700"><Tag className="h-3.5 w-3.5 text-[#0094eb]" /> {niche || 'Nicho não informado'}</span>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 ${priorityCount > 0 ? 'bg-[#fd8539]/15 text-[#c2571a]' : 'bg-emerald-50 text-emerald-700'}`}>
            <AlertTriangle className="h-3.5 w-3.5" />
            {metricsLoading ? 'Analisando sua loja...' : priorityCount > 0 ? `${priorityCount} ${priorityCount === 1 ? 'melhoria prioritária' : 'melhorias prioritárias'} hoje` : 'Nenhuma melhoria urgente'}
          </span>
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por palavra-chave: frete, cadastro, tráfego..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none focus:border-[#0094eb]" />
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-600">
              <input type="checkbox" checked={onlyPending} onChange={(e) => setOnlyPending(e.target.checked)} /> Apenas pendentes
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {[{ key: 'all', label: 'Todas' }, ...CATEGORIES].map((c) => (
              <button key={c.key} type="button" onClick={() => setCat(c.key)}
                className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${cat === c.key ? 'border-[#0094eb] bg-[#0094eb] text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-[#0094eb] hover:text-[#0094eb]'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Carregando dicas...</p>
        ) : priority.length === 0 && feed.length === 0 ? (
          <div className={`${CARD} flex flex-col items-center gap-3 py-14 text-center`}>
            <NoahImg className="h-20 w-20 object-contain opacity-80" fallback={<Lightbulb className="h-12 w-12 text-slate-300" />} />
            <p className="text-sm font-semibold text-slate-600">Nenhuma dica encontrada para este filtro no momento.</p>
            <button type="button" onClick={clear} className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#0094eb] px-4 py-2 text-xs font-bold text-white hover:bg-[#007fcc]">
              <X className="h-3.5 w-3.5" /> Limpar filtros
            </button>
          </div>
        ) : (
          <>
            {priority.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#c2571a]">Diagnóstico prioritário</h2>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">{priority.map((t) => render(t, true))}</div>
              </section>
            )}
            {feed.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Dicas para a sua loja</h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{feed.map((t) => render(t, false))}</div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}