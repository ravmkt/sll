import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Eye, Film, Lightbulb, MousePointerClick, Percent, Sparkles,
  Target, TrendingDown, TrendingUp, Trophy, Wallet, Zap,
} from 'lucide-react';
import { VidlyticsDatabaseService, VidlyticsVideoRow, VidlyticsInsightRow } from '@/services/vidlytics/VidlyticsDatabaseService';

// Metas de referencia internas (ajuste aqui ou substitua por benchmark do banco)
const META = { ctr: 3, conv: 2, eng: 5, views: 100 };

type Level = 'critico' | 'atencao' | 'oportunidade' | 'vitoria';
interface Tip { id: string; level: Level; title: string; data: string; action: string; video?: string }

const LEVELS: Record<Level, { label: string; order: number; border: string; badge: string; iconBox: string; Icon: typeof Zap }> = {
  critico: { label: 'Crítico', order: 0, border: 'border-l-rose-500', badge: 'bg-rose-50 text-rose-600', iconBox: 'bg-rose-50 text-rose-500', Icon: AlertTriangle },
  atencao: { label: 'Atenção', order: 1, border: 'border-l-amber-400', badge: 'bg-amber-50 text-amber-600', iconBox: 'bg-amber-50 text-amber-500', Icon: TrendingDown },
  oportunidade: { label: 'Oportunidade', order: 2, border: 'border-l-sky-400', badge: 'bg-sky-50 text-sky-600', iconBox: 'bg-sky-50 text-[#0094eb]', Icon: Lightbulb },
  vitoria: { label: 'Vitória', order: 3, border: 'border-l-emerald-500', badge: 'bg-emerald-50 text-emerald-600', iconBox: 'bg-emerald-50 text-emerald-500', Icon: Trophy },
};

const pct = (n: number) => `${n.toFixed(1).replace('.', ',')}%`;
const num = (n: number) => n.toLocaleString('pt-BR');
const brl = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Props {
  storeId: string;
  start: string;
  end: string;
  nicho: string;
  dailySeries: { date: string; views: number; clicks: number; likes: number; ctr: number }[];
  insights: VidlyticsInsightRow[];
  insightsLoading: boolean;
}

function MetaBar({ label, value, meta, hint }: { label: string; value: number; meta: number; hint: string }) {
  const max = Math.max(value, meta) * 1.25 || 1;
  const w = Math.min(100, (value / max) * 100);
  const m = (meta / max) * 100;
  const ratio = meta > 0 ? value / meta : 0;
  const color = ratio >= 1 ? 'bg-emerald-500' : ratio >= 0.5 ? 'bg-amber-400' : 'bg-rose-500';
  const txt = ratio >= 1 ? 'text-emerald-600' : ratio >= 0.5 ? 'text-amber-600' : 'text-rose-500';
  return (
    <div className="space-y-1.5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-bold text-slate-700">{label}</p>
          <p className="text-[10px] text-slate-400">{hint}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold leading-none ${txt}`}>{pct(value)}</p>
          <p className="text-[10px] text-slate-400">meta {pct(meta)}</p>
        </div>
      </div>
      <div className="relative h-2.5 rounded-full bg-slate-100">
        <div className={`h-2.5 rounded-full ${color} transition-all`} style={{ width: `${w}%` }} />
        <div className="absolute -top-1 h-5 w-0.5 rounded bg-slate-800/70" style={{ left: `${m}%` }} />
      </div>
    </div>
  );
}

function VideoSpot({ v, kind }: { v: VidlyticsVideoRow; kind: 'best' | 'worst' }) {
  const best = kind === 'best';
  return (
    <div className={`rounded-2xl border p-4 flex items-center gap-4 ${best ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50'}`}>
      {v.thumbnailUrl ? (
        <img src={v.thumbnailUrl} alt={v.title} className="h-20 w-12 rounded-lg object-cover shadow-xs" />
      ) : (
        <div className="flex h-20 w-12 items-center justify-center rounded-lg bg-white"><Film className="h-4 w-4 text-slate-300" /></div>
      )}
      <div className="min-w-0 flex-1">
        <p className={`text-[10px] font-bold uppercase tracking-wider ${best ? 'text-emerald-600' : 'text-rose-500'}`}>
          {best ? 'Melhor vídeo (CTR)' : 'Vídeo que precisa de ajuste'}
        </p>
        <p className="truncate text-sm font-bold text-slate-800">{v.title}</p>
        <p className="mt-1 text-[11px] text-slate-500">
          {num(v.views)} views · {num(v.clicks)} cliques · <strong>CTR {pct(v.ctr)}</strong> · {v.conversions} vendas
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          {best ? 'Replique o formato, o gancho inicial e o CTA deste vídeo.' : 'Teste outro CTA, outra thumbnail ou troque o produto vinculado.'}
        </p>
      </div>
    </div>
  );
}

export default function InsightsPanel({ storeId, start, end, nicho, dailySeries, insights, insightsLoading }: Props) {
  const [rows, setRows] = useState<VidlyticsVideoRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!storeId) { setLoading(false); return; }
    let active = true;
    setLoading(true);
    VidlyticsDatabaseService.getVideosPerformance(storeId, start, end)
      .then((d) => { if (active) setRows(d); })
      .catch((e) => console.error('Erro ao carregar vídeos para insights:', e))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storeId, start, end]);

  const t = useMemo(() => {
    const act = rows.filter((r) => r.views > 0);
    const sum = (k: 'views' | 'clicks' | 'likes' | 'comments' | 'conversions' | 'revenue') => act.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    const views = sum('views');
    const clicks = sum('clicks');
    const likes = sum('likes');
    const comments = sum('comments');
    const conversions = sum('conversions');
    const revenue = sum('revenue');
    return {
      act, views, clicks, likes, comments, conversions, revenue,
      total: rows.length,
      zero: rows.length - act.length,
      ctr: views > 0 ? (clicks / views) * 100 : 0,
      conv: clicks > 0 ? (conversions / clicks) * 100 : 0,
      eng: views > 0 ? ((likes + comments) / views) * 100 : 0,
    };
  }, [rows]);

  const score = useMemo(() => {
    if (t.views === 0) return 0;
    const s =
      Math.min(1, t.ctr / META.ctr) * 40 +
      Math.min(1, t.conv / META.conv) * 30 +
      Math.min(1, t.eng / META.eng) * 15 +
      Math.min(1, t.views / META.views) * 15;
    return Math.round(s);
  }, [t]);

  const tips = useMemo<Tip[]>(() => {
    const out: Tip[] = [];
    if (t.views === 0) return out;
    const add = (level: Level, title: string, data: string, action: string, video?: string) =>
      out.push({ id: `${level}-${out.length}`, level, title, data, action, video });

    if (t.ctr < META.ctr * 0.5 && t.views >= 20) {
      add('critico', 'Poucos espectadores estão clicando', `CTR de ${pct(t.ctr)} contra meta de ${pct(META.ctr)}.`,
        'Mostre o produto nos 3 primeiros segundos, use um CTA claro ("Toque para comprar") e vincule o produto certo a cada vídeo.');
    } else if (t.ctr >= META.ctr) {
      add('vitoria', 'Seu CTR está acima da meta', `${pct(t.ctr)} de CTR, meta de ${pct(META.ctr)}.`,
        'Mantenha o padrão e aumente o alcance: coloque o widget em mais páginas (home, categorias e produtos mais vistos).');
    } else if (t.views >= 20) {
      add('atencao', 'CTR abaixo da meta', `${pct(t.ctr)} de CTR, meta de ${pct(META.ctr)}.`,
        'Teste um CTA mais chamativo e vídeos mais curtos, com o produto aparecendo logo no início.');
    }

    if (t.clicks >= 10 && t.conversions === 0) {
      add('critico', 'Cliques sem nenhuma venda', `${num(t.clicks)} cliques e 0 conversões no período.`,
        'Revise a página de destino (preço, frete, estoque e velocidade) e confira se o rastreio de vendas está integrado.');
    } else if (t.clicks >= 10 && t.conv < META.conv) {
      add('atencao', 'Conversão abaixo da meta', `${pct(t.conv)} dos cliques viraram venda, meta de ${pct(META.conv)}.`,
        'Garanta que o vídeo leve direto ao produto mostrado e deixe preço e prazo de entrega visíveis na página.');
    } else if (t.conversions > 0 && t.conv >= META.conv) {
      add('vitoria', 'Boa conversão dos cliques', `${t.conversions} vendas (${pct(t.conv)} dos cliques) somando ${brl(t.revenue)}.`,
        'Crie mais vídeos dos produtos que já vendem e mostre-os em destaque na home.');
    }

    if (t.views < 50) {
      add('oportunidade', 'Volume de visualizações ainda baixo', `${num(t.views)} views no período.`,
        'Posicione o widget em páginas com mais tráfego e divulgue os vídeos nas redes sociais e no WhatsApp.');
    }

    if (t.views >= 30 && t.eng < 1) {
      add('oportunidade', 'Engajamento social fraco', `${t.likes} curtidas e ${t.comments} comentários (${pct(t.eng)} das views).`,
        'Termine o vídeo com uma pergunta ou convite para comentar e responda os comentários rápido.');
    } else if (t.eng >= META.eng) {
      add('vitoria', 'Público engajado', `${pct(t.eng)} das views geram curtida ou comentário.`,
        'Use os comentários como prova social e para descobrir as dúvidas mais comuns antes de gravar o próximo vídeo.');
    }

    if (t.act.length < 3) {
      add('oportunidade', 'Poucos vídeos ativos', `${t.act.length} ${t.act.length === 1 ? 'vídeo com' : 'vídeos com'} visualizações.`,
        'Publique ao menos 3 a 5 vídeos de produtos diferentes para ampliar o alcance e descobrir o que funciona.');
    }

    if (t.zero > 0) {
      add('atencao', 'Vídeos sem nenhuma visualização', `${t.zero} de ${t.total} vídeos não foram vistos no período.`,
        'Confira se estão publicados e vinculados a uma página onde o widget aparece.');
    }

    const top = [...t.act].sort((a, b) => b.views - a.views)[0];
    if (top && t.act.length > 1 && t.views > 0 && top.views / t.views > 0.7) {
      add('atencao', 'Resultado concentrado em um só vídeo', `"${top.title}" tem ${pct((top.views / t.views) * 100)} das views.`,
        'Diversifique: faça variações desse vídeo para outros produtos e posicione os demais em locais mais visíveis.', top.title);
    }

    const pool = t.act.filter((r) => r.views >= 5);
    const best = [...pool].sort((a, b) => b.ctr - a.ctr)[0];
    if (best && best.ctr >= META.ctr && pool.length > 1) {
      add('vitoria', 'Vídeo campeão de cliques', `CTR de ${pct(best.ctr)} com ${num(best.views)} views.`,
        'Analise o início, a duração e o CTA deste vídeo e repita o formato nos próximos.', best.title);
    }

    pool.filter((r) => r.views >= 15 && r.clicks === 0).slice(0, 2).forEach((r) =>
      add('critico', 'Vídeo com views e nenhum clique', `${num(r.views)} views e 0 cliques.`,
        'Verifique se o produto/CTA está configurado neste vídeo. Se estiver, troque o gancho inicial.', r.title));

    pool.filter((r) => r.views >= 15 && r.clicks > 0 && r.ctr < META.ctr * 0.5).slice(0, 2).forEach((r) =>
      add('atencao', 'CTR baixo neste vídeo', `${pct(r.ctr)} de CTR com ${num(r.views)} views.`,
        'Teste outra thumbnail, encurte o vídeo ou destaque o CTA mais cedo.', r.title));

    if (dailySeries.length >= 4) {
      const h = Math.floor(dailySeries.length / 2);
      const a = dailySeries.slice(0, h).reduce((s, d) => s + d.views, 0);
      const b = dailySeries.slice(h).reduce((s, d) => s + d.views, 0);
      if (a >= 10) {
        const ch = ((b - a) / a) * 100;
        if (ch >= 20) add('vitoria', 'Audiência em crescimento', `Views ${pct(ch)} acima na segunda metade do período.`,
          'Aproveite o embalo: publique um vídeo novo esta semana para manter o ritmo.');
        else if (ch <= -20) add('atencao', 'Audiência em queda', `Views ${pct(Math.abs(ch))} abaixo na segunda metade do período.`,
          'Renove os vídeos, publique novidades e revise se o widget continua visível nas páginas principais.');
      }
    }

    return out.sort((x, y) => LEVELS[x.level].order - LEVELS[y.level].order).slice(0, 10);
  }, [t, dailySeries]);

  const counts = useMemo(() => {
    const c: Record<Level, number> = { critico: 0, atencao: 0, oportunidade: 0, vitoria: 0 };
    tips.forEach((x) => { c[x.level] += 1; });
    return c;
  }, [tips]);

  const pool = t.act.filter((r) => r.views >= 5);
  const bestV = [...pool].sort((a, b) => b.ctr - a.ctr)[0];
  const worstV = pool.length > 1 ? [...pool].sort((a, b) => a.ctr - b.ctr)[0] : undefined;

  if (loading) {
    return <div className="rounded-2xl border border-slate-200/80 bg-white p-16 text-center text-xs text-slate-400 shadow-xs">Analisando suas métricas...</div>;
  }
  if (t.views === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-16 text-center shadow-xs">
        <Sparkles className="mx-auto h-8 w-8 text-slate-300" />
        <h4 className="text-sm font-bold text-slate-700">Ainda não há dados para analisar</h4>
        <p className="mx-auto max-w-sm text-xs text-slate-400">Assim que seus vídeos receberem visualizações neste período, as dicas aparecem aqui.</p>
      </div>
    );
  }

  const ringColor = score >= 75 ? '#10b981' : score >= 50 ? '#0094eb' : score >= 30 ? '#f59e0b' : '#f43f5e';
  const label = score >= 75 ? 'Excelente' : score >= 50 ? 'Bom' : score >= 30 ? 'Em evolução' : 'Começando';
  const R = 52;
  const C = 2 * Math.PI * R;

  const kpis = [
    { Icon: Eye, label: 'Visualizações', value: num(t.views) },
    { Icon: MousePointerClick, label: 'Cliques', value: num(t.clicks) },
    { Icon: Percent, label: 'CTR', value: pct(t.ctr) },
    { Icon: Wallet, label: 'Receita', value: brl(t.revenue) },
  ];

  return (
    <div className="space-y-6">
      {/* HERO */}
      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-[#0b3b5c] p-6 text-white shadow-md">
        <div className="flex flex-col items-center gap-6 md:flex-row">
          <div className="relative h-36 w-36 flex-shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="10" />
              <circle cx="60" cy="60" r={R} fill="none" stroke={ringColor} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)} style={{ transition: 'stroke-dashoffset .8s ease' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-extrabold leading-none">{score}</span>
              <span className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-white/60">de 100</span>
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-3 text-center md:text-left">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Nota de performance</p>
              <h3 className="text-2xl font-extrabold">{label}</h3>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/70">
                Análise dos seus vídeos de <strong className="text-white">{nicho}</strong> no período, considerando cliques, conversões, engajamento e volume.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {(Object.keys(LEVELS) as Level[]).map((k) => (
                <span key={k} className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold">
                  {counts[k]} {LEVELS[k].label}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpis.map(({ Icon, label: l, value }) => (
            <div key={l} className="rounded-2xl bg-white/10 p-3">
              <Icon className="mb-1 h-4 w-4 text-sky-300" />
              <p className="text-lg font-bold leading-tight">{value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wider text-white/60">{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* METAS */}
      <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-slate-700" />
          <h4 className="text-sm font-bold text-slate-800">Você x meta de referência</h4>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <MetaBar label="CTR" value={t.ctr} meta={META.ctr} hint="Cliques ÷ visualizações" />
          <MetaBar label="Conversão" value={t.conv} meta={META.conv} hint="Vendas ÷ cliques" />
          <MetaBar label="Engajamento" value={t.eng} meta={META.eng} hint="(Curtidas + comentários) ÷ views" />
        </div>
      </div>

      {/* DICAS */}
      <div className="space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">O que fazer para melhorar</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tips.map((tip) => {
            const L = LEVELS[tip.level];
            return (
              <div key={tip.id} className={`space-y-3 rounded-2xl border border-slate-200/80 border-l-4 bg-white p-5 shadow-xs ${L.border}`}>
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${L.iconBox}`}>
                    <L.Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${L.badge}`}>{L.label}</span>
                    <h5 className="mt-1 text-sm font-bold text-slate-800">{tip.title}</h5>
                    {tip.video && <p className="truncate text-[10px] font-semibold uppercase text-slate-400">{tip.video}</p>}
                  </div>
                </div>
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-600">Dado: </span>{tip.data}
                </p>
                <p className="flex gap-2 text-xs leading-relaxed text-slate-700">
                  <Zap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#fd8539]" />
                  <span><strong>O que fazer:</strong> {tip.action}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* MELHOR E PIOR */}
      {bestV && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <VideoSpot v={bestV} kind="best" />
          {worstV && worstV.id !== bestV.id && <VideoSpot v={worstV} kind="worst" />}
        </div>
      )}

      {/* DESTAQUES */}
      {!insightsLoading && insights.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Destaques do período</h3>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/80 bg-white shadow-xs">
            {insights.map((i) => (
              <div key={i.id} className="flex items-start gap-3 px-5 py-3">
                <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-pink-400" />
                <div className="min-w-0">
                  {i.videoTitle && <p className="truncate text-[10px] font-bold uppercase text-slate-400">{i.videoTitle}</p>}
                  <p className="text-xs leading-relaxed text-slate-700">{i.insightText}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}