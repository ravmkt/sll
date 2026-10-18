import { useEffect, useMemo, useState } from 'react';
import type { ElementType, KeyboardEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, TrendingDown, TrendingUp, Check, Clock, Copy, DollarSign, Eye, Gift,
  MousePointerClick, Package, Play, Radio, Shirt,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VidlyticsDatabaseService } from '@/services/vidlytics/VidlyticsDatabaseService';
import VidlyticsAcademy from '@/components/vidlytics/VidlyticsAcademy';
import { listScopedTips, pickTip, resolveCta, plainText, type ScopedTip } from '@/services/scopedTips';
import { getSeasonalTip, type SeasonalTip } from '@/services/seasonalTips';
import { useStoreSector } from '@/hooks/useStoreSector';
import DashboardTour from '@/components/dashboard/DashboardTour';
import { joinWaitlist, useDashboardData, usePulse, type DashData } from '@/components/dashboard/useDashboardData';
import { useLoja } from '@/contexts/LojaContext';
import { sortModules } from '@/lib/moduleOrder';
import { showError, showSuccess } from '@/utils/toast';
import PageTour from '@/components/tour/PageTour';
import { DASHBOARD_TOUR } from '@/tours/dashboardTour';

// dash-v11-noah-size
type Periodo = 'today' | '7' | '30' | 'month' | 'custom';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: 'month', label: 'Mês atual' },
  { key: 'custom', label: 'Personalizado' },
];

const ICONS: Record<string, ElementType> = { vidlytics: Play, live_commerce: Radio, provador: Shirt };
const ROUTES: Record<string, string> = { vidlytics: '/dashboard/modules/vidlytics', live_commerce: '/dashboard/modules/live-commerce' };


const pad = (n: number) => String(n).padStart(2, '0');
const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const int = (n: number) => (n || 0).toLocaleString('pt-BR');
const brl = (n: number) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (n: number) => `${(n || 0).toFixed(1).replace('.', ',')}%`;

const LEVELS = [
  { n: 0, name: 'Bronze' },
  { n: 10, name: 'Prata' },
  { n: 25, name: 'Ouro' },
  { n: 50, name: 'Diamante' },
  { n: 100, name: 'Platinum' },
];

const CLUB_LOGO = '/assets/clube-sll-logo-wide.png';
const NOAH_LOGO = '/assets/dica-do-noah-logo-wide.png';
const METRICS_ROUTE = '/dashboard/metricas';
const TIPS_ROUTE = '/dashboard/dicas';
const PRODUCTS_ROUTE = '/dashboard/produtos';

function AssetImg({ src, alt, className, fallback }: { src: string; alt: string; className: string; fallback: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <>{fallback}</>;
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}

const CARD = 'rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md';
const DATE_IN = 'h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus:border-[#0094eb]';


function Metric({ label, value, hint, icon: Icon, onClick, badge }: {
  label: string; value: string; hint: string; icon: ElementType; onClick?: () => void; badge?: ReactNode;
}) {
  return (
    <div
      {...(onClick
        ? { role: 'button', tabIndex: 0, onClick, onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter') onClick(); } }
        : {})}
      className={`${CARD} flex h-full min-h-[148px] flex-col justify-between p-4 ${onClick ? 'cursor-pointer hover:border-[#0094eb]/40' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-3xl font-bold text-slate-900">{value}</p>
        <p className="mt-0.5 text-sm text-slate-700">{hint}</p>
      </div>
      <div className="min-h-[20px]">{badge}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
      <p className="text-sm font-semibold leading-tight text-slate-700">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

function buildInsight(d: DashData, hasVid: boolean): { title: string; text: string } {
  if (hasVid && d.totalVideos === 0) {
    return {
      title: 'Suba seu primeiro vídeo',
      text: 'Sua loja ainda não tem vídeos interativos. Suba um vídeo de 15 a 30 segundos mostrando os detalhes da sua peça mais vendida para destravar as primeiras vendas assistidas.',
    };
  }
  if (hasVid && d.viewsRange >= 30 && d.ctrRange < 2) {
    return {
      title: 'Muitas views, poucos cliques',
      text: 'Seus vídeos estão sendo vistos, mas poucos clicam no produto. Ajuste o botão de compra para aparecer logo nos primeiros segundos do vídeo e deixe o CTA mais direto.',
    };
  }
  if (hasVid && d.topVideo) {
    return {
      title: 'Destaque seu vídeo campeão',
      text: `O vídeo "${d.topVideo.title}" é o que mais converte no período. Que tal usá-lo em destaque também na página inicial da loja?`,
    };
  }
  if (d.referred === 0) {
    return {
      title: 'Indique lojistas e ganhe todo mês',
      text: 'Cada loja que você indica e que assina te paga comissão recorrente todo mês. Compartilhe seu link exclusivo do Clube SLL.',
    };
  }
  if (d.products === 0) {
    return {
      title: 'Sincronize seus produtos',
      text: 'Importe ou cadastre seus produtos para poder vincular vídeos e liberar a compra direta pelo conteúdo.',
    };
  }
  return {
    title: 'Acompanhe seus números toda semana',
    text: 'Compare períodos no filtro acima e repita o formato dos vídeos que geram mais cliques e vendas.',
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };

  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [cs, setCs] = useState(() => ymd(addDays(new Date(), -29)));
  const [ce, setCe] = useState(() => ymd(new Date()));
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [busySlug, setBusySlug] = useState<string | null>(null);

  const range = useMemo(() => {
    const now = new Date();
    if (periodo === 'custom') return { start: cs, end: ce };
    if (periodo === 'today') return { start: ymd(now), end: ymd(now) };
    if (periodo === 'month') return { start: ymd(new Date(now.getFullYear(), now.getMonth(), 1)), end: ymd(now) };
    return { start: ymd(addDays(now, -(Number(periodo) - 1))), end: ymd(now) };
  }, [periodo, cs, ce]);

  const { data, loading } = useDashboardData(storeId, range);
  const pulse = usePulse(storeId);

  const sectorId = useStoreSector();
  const [hubTips, setHubTips] = useState<ScopedTip[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalTip | null>(null);
  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    if (sectorId === undefined) return;
    getSeasonalTip(sectorId, 'hub').then((s) => { if (alive) setSeasonal(s); });
    return () => { alive = false; };
  }, [storeId, sectorId]);
  useEffect(() => {
    let alive = true;
    listScopedTips('hub').then((l) => { if (alive) setHubTips(l); });
    return () => { alive = false; };
  }, []);

  const [prevRevenue, setPrevRevenue] = useState<number | null>(null);
  useEffect(() => {
    if (!storeId || range.start > range.end) return;
    const s = new Date(range.start + 'T00:00:00');
    const e = new Date(range.end + 'T00:00:00');
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    let alive = true;
    VidlyticsDatabaseService.getOverviewMetrics(storeId, ymd(addDays(s, -days)), ymd(addDays(s, -1)))
      .then((m: any) => { if (alive) setPrevRevenue(Number(m?.totalRevenue) || 0); })
      .catch(() => { if (alive) setPrevRevenue(null); });
    return () => { alive = false; };
  }, [storeId, range.start, range.end]);

  const delta = prevRevenue !== null && prevRevenue > 0 ? ((data.assistedRevenue - prevRevenue) / prevRevenue) * 100 : null;
  const deltaUp = delta === null || delta >= 0;
  const deltaText =
    delta !== null
      ? `${delta >= 0 ? '+' : ''}${delta.toFixed(1).replace('.', ',')}% vs período anterior`
      : data.assistedRevenue > 0 ? 'Novo no período' : '+0% vs período anterior';

  const referralLink = store?.referral_code ? `${window.location.origin}/?ref=${store.referral_code}` : '';
  const lvIdx = LEVELS.reduce((acc, l, i) => (data.referred >= l.n ? i : acc), 0);
  const cur = LEVELS[lvIdx];
  const nxt = LEVELS[lvIdx + 1] ?? null;
  const segFrac = nxt ? (data.referred - cur.n) / (nxt.n - cur.n) : 0;
  const clubPct = nxt ? Math.min(100, Math.round(((lvIdx + segFrac) / (LEVELS.length - 1)) * 100)) : 100;
  const noModule = !loading && data.owned.length === 0;
  const hasVid = data.owned.includes('vidlytics');
  const total = data.assistedRevenue + data.clubCommission;
  const hubTip = pickTip(hubTips, { sectorId, niche: store?.store_niche || '' }, {
    ctr: data.ctrRange, views: data.viewsRange, clicks: data.clicksRange, revenue: data.assistedRevenue,
    products: data.products, videos: data.totalVideos, referred: data.referred,
  });
  const hubCta = seasonal ? (seasonal.source ? resolveCta(seasonal.source, data.owned) : null) : hubTip ? resolveCta(hubTip, data.owned) : null;
  const insight = seasonal ? { title: seasonal.title, text: seasonal.text } : hubTip ? { title: hubTip.title, text: plainText(hubTip.content) } : buildInsight(data, hasVid);
  const visibleMods = sortModules(data.modules.filter((m) => m.status !== 'hidden'), data.owned);
  const modCols = visibleMods.length <= 1 ? 'md:grid-cols-1' : visibleMods.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3';

  const copy = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    showSuccess('Link copiado! Compartilhe com seus amigos.');
  };

    const onWait = async (slug: string) => {
    if (!storeId) return;
    setBusySlug(slug);
    const ok = await joinWaitlist(storeId, slug);
    setBusySlug(null);
    if (ok) {
      setJoined((p) => new Set(p).add(slug));
      showSuccess('Você entrou na lista de espera. Avisaremos quando abrir.');
    } else {
      showError('Não foi possível entrar na lista agora. Tente novamente.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Resultados com filtro de periodo */}
        <div data-tour="kpis" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">Resultados da sua loja</h2>
              <p className="text-sm text-slate-700">O que o SLL Hub gerou no período escolhido.</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap items-center justify-end gap-2">
              {periodo === 'custom' && (
                <>
                  <input type="date" value={cs} max={ce} onChange={(e) => setCs(e.target.value)} className={DATE_IN} />
                  <span className="text-xs text-slate-400">até</span>
                  <input type="date" value={ce} min={cs} onChange={(e) => setCe(e.target.value)} className={DATE_IN} />
                </>
              )}
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
                {PERIODOS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPeriodo(p.key)}
                    className={`cursor-pointer rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                      periodo === p.key ? 'bg-[#0094eb] text-white shadow-sm' : 'text-slate-500 hover:text-[#0094eb]'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              </div>
            </div>
          </div>

          <div className={`grid grid-cols-1 items-stretch gap-3 sm:grid-cols-2 xl:grid-cols-5 ${loading ? 'opacity-60' : ''}`}>
            <div className={`${CARD} flex h-full min-h-[148px] flex-col justify-between p-4`}>
              
              
              <div className="relative flex items-start justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Impacto financeiro</p>
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="relative min-w-0">
                <p className="truncate text-3xl font-bold text-emerald-600">{brl(total)}</p>
                <p className="mt-0.5 text-sm text-slate-700">Vendas assistidas + comissões do Clube</p>
              </div>
              <span className={`relative inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${deltaUp ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {deltaUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />} {deltaText}
              </span>
            </div>

            <Metric label="Catálogo ativo" value={int(data.products)} hint="SKUs sincronizados" icon={Package} onClick={() => navigate(PRODUCTS_ROUTE)} />
            <Metric label="Visualizações" value={hasVid ? int(data.viewsRange) : '—'} hint={hasVid ? 'Vídeos no período' : 'Ative o Vidlytics'} icon={Eye} />
            <Metric label="Cliques & interações" value={hasVid ? int(data.clicksRange) : '—'} hint={hasVid ? 'Comprar e WhatsApp' : 'Ative o Vidlytics'} icon={MousePointerClick} />
            <Metric label="Taxa de conversão (CTR)" value={hasVid ? pct(data.ctrRange) : '—'} hint={hasVid ? 'Cliques ÷ visualizações' : 'Ative o Vidlytics'} icon={Activity} />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate(METRICS_ROUTE)}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#0094eb] hover:underline"
            >
              Ver relatório completo de métricas <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Pulso de hoje + dica */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className={`${CARD} flex flex-col gap-4 p-5`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                <h3 className="text-base font-black text-slate-900">Movimentação de Hoje</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Atividade de hoje</span>
            </div>
            {hasVid ? (
              <div className="grid grid-cols-3 gap-2">
                <Mini label="Pessoas que interagiram" value={pulse ? int(pulse.interactions) : '—'} />
                <Mini label="Cliques em comprar" value={pulse ? int(pulse.buyClicks) : '—'} />
                <Mini label="Sessões com vídeo engajado" value={pulse ? int(pulse.engaged) : '—'} />
              </div>
            ) : noModule ? (
              <button
                type="button"
                onClick={() => navigate('/dashboard/planos')}
                className="flex w-full cursor-pointer flex-col items-start gap-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-left transition-colors hover:border-[#0094eb]"
              >
                <span className="text-sm font-black text-slate-900">Ative seu primeiro módulo</span>
                <span className="text-sm text-slate-700">Assim você acompanha o engajamento dos seus clientes aqui.</span>
                <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-[#0094eb]">
                  Ver planos <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ) : !loading ? (
              <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm font-medium text-slate-600">
                A atividade dos seus módulos ativos aparecerá aqui.
              </p>
            ) : null}
            <p className="mt-auto text-sm text-slate-700">Os módulos trabalham no piloto automático enquanto você cuida do resto.</p>
          </div>

          <div className={`${CARD} flex flex-col gap-3 p-5`} data-tour="noah">
            <div className="flex items-center gap-3">
              <AssetImg src={NOAH_LOGO} alt="Dica do Noah" className="h-12 w-auto max-w-[220px] shrink-0 object-contain" fallback={<h3 className="text-base font-black text-slate-900">Dica do Noah</h3>} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-800">{insight.title}</p>
              <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">
                {insight.text}
                {hubCta && (
                  <>
                    {' '}
                    <button
                      type="button"
                      onClick={() => (/^https?:\/\//i.test(hubCta.url) ? window.open(hubCta.url, '_blank', 'noopener') : navigate(hubCta.url))}
                      className="inline cursor-pointer font-bold text-[#0094eb] hover:underline"
                    >
                      Saiba mais →
                    </button>
                  </>
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate(TIPS_ROUTE)}
              className="inline-flex cursor-pointer items-center gap-1.5 self-end text-xs font-bold text-[#0094eb] hover:underline"
            >
              Ver mais dicas e insights <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <PageTour tourKey="dashboard" steps={DASHBOARD_TOUR} />
        {/* Modulos vindos do Master */}
        <div id="meus-modulos" data-tour="modules" className="scroll-mt-24">
          <Section title="Módulos">
            {visibleMods.length === 0 && !loading && (
              <p className="text-sm text-slate-500">Nenhum módulo disponível no momento.</p>
            )}
            <div className={`-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 md:mx-0 md:grid ${modCols} md:overflow-visible md:px-0 md:pb-0`}>
              {visibleMods.map((m) => {
                const owned = data.owned.includes(m.slug);
                if (m.status === 'hidden') return null;

                const maint = m.status === 'maintenance';
                const soon = m.status === 'coming_soon' && !owned;
                const trial = data.trialDays[m.slug];
                const Icon = ICONS[m.slug] ?? Package;
                const route = m.route_path || ROUTES[m.slug];
                const isJoined = joined.has(m.slug) || data.waitlist.includes(m.slug);

                return (
                  <div key={m.slug} className={`${CARD} flex w-[85%] shrink-0 snap-center flex-col gap-4 p-5 md:w-auto ${owned ? '' : 'border-dashed'}`}>
                    <div className="flex items-start justify-between gap-3">
                      {m.logo_url ? (
                        <img src={m.logo_url} alt={m.name} className="h-20 w-auto max-w-[65%] object-contain object-left" />
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0094eb]/15 to-[#0094eb]/5 ring-1 ring-[#0094eb]/15">
                            <Icon className="h-9 w-9 text-[#0094eb]" />
                          </div>
                          <h3 className="text-lg font-black text-slate-900">{m.name}</h3>
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        {maint ? (
                          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-700">Em manutenção</span>
                        ) : owned ? (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700">● Ativo</span>
                        ) : soon ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">Em breve</span>
                        ) : (
                          <span className="rounded-full bg-[#0094eb]/10 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#0094eb]">Disponível</span>
                        )}
                        {owned && trial && (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
                            <Clock className="h-3 w-3" /> Teste: {trial} {trial === 1 ? 'dia' : 'dias'}
                          </span>
                        )}
                      </div>
                    </div>

                    {m.description && <p className="text-sm font-medium leading-relaxed text-slate-700">{m.description}</p>}

                    {owned && m.slug === 'vidlytics' ? (
                      <div className="grid grid-cols-3 gap-2">
                        <Mini label="Vídeos cadastrados" value={int(data.totalVideos)} />
                        <Mini label="Views no período" value={int(data.viewsRange)} />
                        <Mini label="CTR do período" value={pct(data.ctrRange)} />
                      </div>
                    ) : owned ? (
                      <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600">
                        {trial ? `Em período de teste: ${trial} ${trial === 1 ? 'dia restante' : 'dias restantes'}` : 'Módulo ativo na sua loja.'}
                      </div>
                    ) : (
                      m.benefits.length > 0 && (
                        <ul className="space-y-2">
                          {m.benefits.map((b) => (
                            <li key={b} className="flex items-start gap-2 text-sm font-medium text-slate-700">
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#0094eb]" /> {b}
                            </li>
                          ))}
                        </ul>
                      )
                    )}

                    <div className="mt-auto pt-1">
                      {maint ? (
                        <button type="button" disabled className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500">
                          Em manutenção
                        </button>
                      ) : owned ? (
                        route ? (
                          <button type="button" onClick={() => navigate(route)} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700">
                            Acessar painel <ArrowRight className="h-3.5 w-3.5" />
                          </button>
                        ) : null
                      ) : soon ? (
                        <button
                          type="button"
                          disabled={isJoined || busySlug === m.slug}
                          onClick={() => onWait(m.slug)}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold ${
                            isJoined ? 'cursor-default bg-emerald-50 text-emerald-700' : 'cursor-pointer bg-[#0094eb] text-white hover:bg-[#007fcc] disabled:opacity-60'
                          }`}
                        >
                          {isJoined ? <><Check className="h-3.5 w-3.5" /> Você está na lista</> : busySlug === m.slug ? 'Entrando...' : 'Entrar na lista de espera'}
                        </button>
                      ) : (
                        <button type="button" onClick={() => navigate(`/dashboard/planos?modulo=${m.slug}`)} className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]">
                          Ativar módulo <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        </div>

        {/* Clube + Academy */}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div data-tour="club" className={`${CARD} flex flex-col gap-4 p-5`}>
            <div className="flex flex-col items-start gap-2">
              <AssetImg src={CLUB_LOGO} alt="Clube SLL" className="h-12 w-auto max-w-[220px] shrink-0 object-contain" fallback={<span className="text-base font-black text-slate-900">Clube SLL</span>} />
              <p className="text-sm font-medium text-slate-700">Indique lojas, suba de nível e conquiste benefícios exclusivos.</p>
            </div>
            <div className="space-y-2 rounded-xl bg-slate-50 p-4">
              <div className="flex items-end justify-between gap-2">
                <p className="text-2xl font-black text-slate-900">
                  {int(data.referred)} <span className="text-base text-slate-400">/ {nxt ? nxt.n : data.referred}</span>{' '}
                  <span className="text-sm font-bold text-slate-600">{data.referred === 1 ? 'loja indicada' : 'lojas indicadas'}</span>
                </p>
                <span className="rounded-full bg-[#0094eb]/10 px-3 py-1 text-[11px] font-bold text-[#0094eb]">Nível {cur.name}</span>
              </div>
              <div className="relative pt-1">
                <div className="absolute left-[10%] right-[10%] top-[10px] h-2 -translate-y-1/2 rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-[#0094eb] transition-all duration-500" style={{ width: `${clubPct}%` }} />
                </div>
                <div className="relative grid grid-cols-5">
                  {LEVELS.map((l, i) => (
                    <div key={l.name} className="flex flex-col items-center gap-1.5">
                      <span className={`h-[18px] w-[18px] rounded-full border-2 ${i <= lvIdx ? 'border-[#0094eb] bg-[#0094eb]' : 'border-slate-300 bg-white'}`} />
                      <span className={`text-xs font-bold ${i === lvIdx ? 'text-[#0094eb]' : 'text-slate-700'}`}>{l.name}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm font-medium text-slate-700">
                {nxt
                  ? `Faltam ${nxt.n - data.referred} ${nxt.n - data.referred === 1 ? 'loja' : 'lojas'} para subir ao nível ${nxt.name}.`
                  : 'Você chegou ao nível máximo do Clube SLL.'}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                {referralLink || 'Gerando seu link...'}
              </div>
              <button type="button" onClick={copy} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]">
                <Copy className="h-3.5 w-3.5" /> Copiar link
              </button>
            </div>
            <button type="button" onClick={() => navigate('/dashboard/afiliados')} className="mt-auto inline-flex cursor-pointer items-center gap-1.5 self-end text-xs font-bold text-[#0094eb] hover:underline">
              <Gift className="h-3.5 w-3.5" /> Ver ganhos e metas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="flex min-w-0 flex-col [&>*]:h-full [&>*]:flex-1">
            <VidlyticsAcademy variant="hub" />
          </div>
        </div>
      </div>

      {storeId && <DashboardTour storeId={storeId} createdAt={store?.created_at} />}
    </DashboardLayout>
  );
}