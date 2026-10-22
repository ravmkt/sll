import ModuleTrialButton from '@/components/dashboard/ModuleTrialButton';
import SubscribeModalButton from '@/components/dashboard/SubscribeModalButton';
import { useEffect, useMemo, useState } from 'react';
import type { ElementType, KeyboardEvent, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, ArrowRight, TrendingDown, TrendingUp, Check, Clock, Copy, DollarSign, Eye, Gift,
  MousePointerClick, Package, Play, Radio, Shirt, MessageCircle, ArrowUpRight, Lightbulb, Plug,
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
import { AffiliateDatabaseService, type AffiliateSettings } from '@/services/AffiliateDatabaseService';
import { ClubeTermsModal } from '@/components/afiliados/ClubeTermsModal';
import { TERMS_VERSION } from '@/components/afiliados/clubeTerms';
import PageTour from '@/components/tour/PageTour';
import CalendarioComercialHub from '@/components/dashboard/CalendarioComercialHub';
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

type Shortcut = { key: string; icon: ElementType; title: string; text: string; to: string; tour?: string };
const SHORTCUT_POOL: Shortcut[] = [
  { key: 'cat', icon: Package, title: 'Vídeos e catálogo', text: 'Organize o conteúdo da sua loja', to: PRODUCTS_ROUTE },
  { key: 'ins', icon: Lightbulb, title: 'Insights', text: '', to: TIPS_ROUTE, tour: 'noah' },
  { key: 'inst', icon: Plug, title: 'Instalação', text: 'Acesse a configuração dos módulos', to: '/dashboard/integracao' },
  { key: 'plan', icon: DollarSign, title: 'Assinatura & Planos', text: 'Gerencie módulos e cobrança', to: '/dashboard/planos' },
  { key: 'club', icon: Gift, title: 'Clube SLL', text: 'Indique lojas e acompanhe ganhos', to: '/dashboard/afiliados' },
  { key: 'met', icon: Activity, title: 'Métricas', text: 'Relatório completo de resultados', to: METRICS_ROUTE },
];

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

function Mini({ label, value, icon: Icon }: { label: string; value: string; icon: ElementType }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-1.5 rounded-xl bg-sky-50/70 px-3 py-3 text-center ring-1 ring-[#0094eb]/10">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#0094eb] shadow-sm"><Icon className="h-4 w-4" /></div>
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

function ModulePreview({ slug }: { slug: string }) {
  const wrap = 'relative flex h-28 items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-br from-[#0094eb]/10 via-slate-50 to-slate-100 p-3';
  if (slug === 'vidlytics') {
    return (
      <div className={wrap} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`relative h-full w-16 rounded-lg bg-white shadow-sm ring-1 ring-slate-200 ${i === 1 ? '-translate-y-1 scale-105' : ''}`}>
            <div className="absolute inset-1 rounded-md bg-gradient-to-b from-slate-200 to-slate-300" />
            <div className="absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow">
              <Play className="ml-0.5 h-3 w-3 fill-[#0094eb] text-[#0094eb]" />
            </div>
            <div className="absolute bottom-2 left-2 right-2 h-1 rounded-full bg-white/80" />
          </div>
        ))}
      </div>
    );
  }
  if (slug === 'live_commerce') {
    return (
      <div className={wrap} aria-hidden="true">
        <div className="relative h-full w-40 rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
          <div className="h-full rounded-md bg-gradient-to-br from-slate-200 to-slate-300" />
          <span className="absolute left-3 top-3 rounded bg-rose-500 px-1.5 py-0.5 text-[8px] font-black uppercase text-white">Ao vivo</span>
          <div className="absolute bottom-3 right-3 h-5 w-10 rounded bg-white/90 shadow" />
        </div>
        <div className="flex h-full w-14 flex-col justify-center gap-1.5">
          <div className="h-2 w-full rounded-full bg-white shadow-sm" />
          <div className="h-2 w-3/4 rounded-full bg-white shadow-sm" />
          <div className="h-2 w-full rounded-full bg-white shadow-sm" />
        </div>
      </div>
    );
  }
  return (
    <div className={wrap} aria-hidden="true">
      <div className="flex w-44 flex-col gap-1.5">
        <div className="w-3/4 rounded-lg rounded-bl-sm bg-white px-2 py-1.5 shadow-sm ring-1 ring-slate-200"><div className="h-1.5 w-full rounded-full bg-slate-200" /></div>
        <div className="ml-auto w-2/3 rounded-lg rounded-br-sm bg-[#0094eb] px-2 py-1.5 shadow-sm"><div className="h-1.5 w-full rounded-full bg-white/70" /></div>
        <div className="w-4/5 rounded-lg rounded-bl-sm bg-white px-2 py-1.5 shadow-sm ring-1 ring-slate-200"><div className="h-1.5 w-full rounded-full bg-slate-200" /></div>
      </div>
    </div>
  );
}
export default function Dashboard() {
  const navigate = useNavigate();
  const { store, storeId } = useLoja() as { store: any; storeId: string | null };

  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [cs, setCs] = useState(() => ymd(addDays(new Date(), -29)));
  const [ce, setCe] = useState(() => ymd(new Date()));
  const [joined, setJoined] = useState<Set<string>>(new Set());
  const [busySlug, setBusySlug] = useState<string | null>(null);

  // Aceite das regras do Clube (null = carregando)
  const [termsAccepted, setTermsAccepted] = useState<boolean | null>(null);
  const [termsOpen, setTermsOpen] = useState(false);
  const [clubSettings, setClubSettings] = useState<AffiliateSettings>({
    grace_days: 7, payout_day: 10, min_withdrawal: 50, commission_rate: 10, recurring_months: 0, first_payment_bonus: 0,
  });
  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    Promise.all([
      AffiliateDatabaseService.getSettings(),
      AffiliateDatabaseService.getTermsAcceptance(storeId, TERMS_VERSION),
    ])
      .then(([s, a]) => { if (!alive) return; setClubSettings(s); setTermsAccepted(!!a); })
      .catch(() => { if (alive) setTermsAccepted(false); });
    return () => { alive = false; };
  }, [storeId]);

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
  const showcaseMods = visibleMods.filter((m) => !data.owned.includes(m.slug));
  const apps = visibleMods.filter((m) => data.owned.includes(m.slug) && m.status !== 'maintenance' && (m.route_path || ROUTES[m.slug]));

  const hitsKey = `sll_shortcuts:${storeId ?? 'x'}`;
  const [shortcutHits, setShortcutHits] = useState<Record<string, number>>({});
  useEffect(() => {
    try { setShortcutHits(JSON.parse(localStorage.getItem(hitsKey) || '{}')); } catch { setShortcutHits({}); }
  }, [hitsKey]);
  const bumpShortcut = (key: string) => {
    const next = { ...shortcutHits, [key]: (shortcutHits[key] ?? 0) + 1 };
    setShortcutHits(next);
    try { localStorage.setItem(hitsKey, JSON.stringify(next)); } catch { /* ignora */ }
  };
  const shortcuts = SHORTCUT_POOL
    .map((s, i) => ({ ...s, i, text: s.key === 'ins' ? insight.title : s.text }))
    .sort((a, b) => (shortcutHits[b.key] ?? 0) - (shortcutHits[a.key] ?? 0) || a.i - b.i)
    .slice(0, 5);

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

  void hubCta; void pulse; void noModule;
  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Resultados com filtro de periodo */}
        <div data-tour="kpis" className="mb-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold leading-tight text-slate-900">Resultados da sua loja</h2>
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
            <div className={hasVid ? 'contents' : 'opacity-50 [&>*]:h-full'}><Metric label="Visualizações" value={hasVid ? int(data.viewsRange) : '0'} hint={hasVid ? 'Vídeos no período' : 'Ative o Vidlytics'} icon={Eye} /></div>
            <div className={hasVid ? 'contents' : 'opacity-50 [&>*]:h-full'}><Metric label="Cliques & interações" value={hasVid ? int(data.clicksRange) : '0'} hint={hasVid ? 'Comprar e WhatsApp' : 'Ative o Vidlytics'} icon={MousePointerClick} /></div>
            <div className={hasVid ? 'contents' : 'opacity-50 [&>*]:h-full'}><Metric label="Taxa de conversão (CTR)" value={hasVid ? pct(data.ctrRange) : '0%'} hint={hasVid ? 'Cliques ÷ visualizações' : 'Ative o Vidlytics'} icon={Activity} /></div>
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

        {/* Mais possibilidades para a sua loja */}
        <div id="meus-modulos" data-tour="modules" className="scroll-mt-24 space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold leading-tight text-slate-900">Mais possibilidades para a sua loja</h2>
              <p className="text-sm text-slate-500">Use o que já está ativo. Experimente ou contrate o próximo módulo no seu ritmo.</p>
            </div>
          </div>
          {(() => {
            type ShopMod = (typeof showcaseMods)[number];
            const ownedSet = new Set<string>([...data.owned, ...apps.map((x) => x.slug)]);
            const bySlug = new Map<string, ShopMod>();
            (apps as unknown as ShopMod[]).forEach((x) => bySlug.set(x.slug, x));
            showcaseMods.forEach((x) => bySlug.set(x.slug, x));
            const rank = (m: ShopMod) => (ownedSet.has(m.slug) ? 0 : m.status === 'coming_soon' ? 2 : 1);
            const list = Array.from(bySlug.values())
              .filter((m) => m.status !== 'hidden' && !/^m[oó]d[uú]l[eo]\s+(de\s+)?teste/i.test(m.name))
              .sort((x, y) => rank(x) - rank(y));

            if (list.length === 0) {
              return loading ? null : (
                <div className={`${CARD} p-5 text-sm text-slate-500`}>Nenhum módulo disponível no momento.</div>
              );
            }

            return (
              <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3">
                {[...list, ...Array.from({ length: Math.max(0, 3 - list.length) }, () => null)].map((m, i) => {
                  if (!m) {
                    return (
                      <div key={`soon-${i}`} className="hidden h-full min-h-[240px] flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-6 text-center md:flex">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200">
                          <Package className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-bold text-slate-700">Em breve</p>
                        <p className="text-xs font-medium text-slate-500">Novos módulos para sua operação.</p>
                      </div>
                    );
                  }
                  const owned = ownedSet.has(m.slug);
                  const maint = m.status === 'maintenance';
                  const soon = m.status === 'coming_soon' && !owned;
                  const trial = data.trialDays[m.slug];
                  const Icon = ICONS[m.slug] ?? Package;
                  const route = (m.route_path || ROUTES[m.slug]) as string | undefined;
                  const isJoined = joined.has(m.slug) || data.waitlist.includes(m.slug);
                  const used = !owned && !soon && !maint && (data.trialUsed ?? []).includes(m.slug);

                  return (
                    <div key={m.slug} className={`${CARD} flex h-full flex-col justify-between gap-4 p-4`}>
                      <div className="relative flex flex-col items-center gap-3 pt-8">
                        <div className="absolute right-0 top-0">
                          {maint ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{'\u2022'} Em manutenção</span>
                          ) : owned && trial ? (
                            <span className="rounded-full bg-[#0094eb]/10 px-2.5 py-1 text-xs font-semibold text-[#0094eb]">
                              {'\u2022'} Em teste: {trial} {trial === 1 ? 'dia' : 'dias'}
                            </span>
                          ) : owned ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{'\u2022'} Ativo</span>
                          ) : soon ? (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{'\u2022'} Em breve</span>
                          ) : used ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">{'\u2022'} Teste encerrado</span>
                          ) : (
                            <span className="rounded-full bg-[#0094eb]/10 px-2.5 py-1 text-xs font-semibold text-[#0094eb]">{'\u2022'} Teste grátis disponível</span>
                          )}
                        </div>
                        {m.logo_url ? (
                          <img src={m.logo_url} alt={m.name} className="h-24 w-auto max-w-[85%] object-contain object-center" />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#0094eb]/10 ring-1 ring-[#0094eb]/15">
                              <Icon className="h-10 w-10 text-[#0094eb]" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">{m.name}</h3>
                          </div>
                        )}
                        {m.description && (
                          <p className="line-clamp-3 text-center text-sm font-medium leading-relaxed text-slate-600">{m.description}</p>
                        )}
                      </div>

                      <div className="mt-auto space-y-2">
                        {maint ? (
                          <button type="button" disabled className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500">
                            Em manutenção
                          </button>
                        ) : owned ? (
                          route ? (
                            <button
                              type="button"
                              onClick={() => navigate(route)}
                              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:border-[#0094eb] hover:text-[#0094eb]"
                            >
                              Acessar {m.name} <ArrowRight className="h-3.5 w-3.5" />
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
                          used ? (
                          <SubscribeModalButton
                            slug={m.slug}
                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#fd8539] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#e07128]"
                          >
                            Assinar {m.name} <ArrowRight className="h-3.5 w-3.5" />
                          </SubscribeModalButton>
                        ) : (
                          <ModuleTrialButton slug={m.slug} route={route} />
                        )
                        )}
                        <p className="text-center text-[11px] font-medium text-slate-500">
                          {maint
                            ? 'Voltamos em instantes.'
                            : owned
                              ? trial ? `Aproveite o teste: ${trial === 1 ? 'falta 1 dia' : `faltam ${trial} dias`}.` : 'Seu módulo está pronto para usar.'
                              : soon ? 'Avisaremos quando abrir.' : used ? 'Você já utilizou o teste grátis.' : 'Explore o módulo antes de contratar.'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/dashboard/planos')}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#0094eb] hover:underline"
            >
              Ver módulos e planos <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
        {/* Sua operacao, sem perder o ritmo */}
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-bold leading-tight text-slate-900">Acesso rápido e datas que importam</h2>
            <p className="text-sm text-slate-500">Vá direto ao que você mais usa e planeje as próximas datas comemorativas da sua loja.</p>
          </div>
          <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-2">
            <div className={`${CARD} flex flex-col gap-3 p-5`}>
              <div>
                <h3 className="text-base font-black text-slate-900">Acesso rápido</h3>
                <p className="text-sm text-slate-500">Atalhos para o que você mais usa.</p>
              </div>
              <div className="grid flex-1 grid-cols-1 gap-2 grid-cols-1">
                {shortcuts.map((it) => (
                  <button
                    key={it.key}
                    type="button"
                    data-tour={it.tour}
                    onClick={() => { bumpShortcut(it.key); navigate(it.to); }}
                    className="group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left transition-all hover:border-[#0094eb]/40 hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#0094eb]/10 text-[#0094eb]">
                      <it.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900">{it.title}</p>
                      <p className="truncate text-xs font-medium text-slate-500">{it.text}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-[#0094eb]" />
                  </button>
                ))}
              </div>
            </div>
            <CalendarioComercialHub />
          </div>
        </div>
        <PageTour tourKey="dashboard" steps={DASHBOARD_TOUR} />
        {/* Clube + Academy */}
        <div className="mb-4">
          <h2 className="text-xl font-bold leading-tight text-slate-900">Para ir além, no seu tempo</h2>
          <p className="text-sm text-slate-500">Indique lojistas, ganhe benefícios e domine estratégias práticas para o seu e-commerce.</p>
        </div>
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
            {termsAccepted ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="min-w-0 flex-1 truncate rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
                  {referralLink || 'Gerando seu link...'}
                </div>
                <button type="button" onClick={copy} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0094eb] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#007fcc]">
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </button>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Conheça o SLL Hub e comece com teste grátis: ${referralLink}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <MessageCircle className="h-3.5 w-3.5" /> Enviar no WhatsApp
                </a>
              </div>
            ) : (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={termsAccepted === null}
                  onClick={() => setTermsOpen(true)}
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#fd8539] px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#e07128] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Ativar meu link de indicação
                </button>
              </div>
            )}
            <button type="button" onClick={() => navigate('/dashboard/afiliados')} className="mt-auto inline-flex cursor-pointer items-center gap-1.5 self-end text-xs font-bold text-[#0094eb] hover:underline">
              <Gift className="h-3.5 w-3.5" /> Ver ganhos e metas <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          <div className="flex min-w-0 flex-col [&>*]:h-full [&>*]:flex-1">
            <VidlyticsAcademy variant="hub" />
          </div>
        </div>

      </div>

      {storeId && (
        <ClubeTermsModal
          open={termsOpen}
          storeId={storeId}
          settings={clubSettings}
          onClose={() => setTermsOpen(false)}
          onAccepted={() => { setTermsAccepted(true); setTermsOpen(false); }}
        />
      )}
      {storeId && <DashboardTour storeId={storeId} createdAt={store?.created_at} />}
    </DashboardLayout>
  );
}

void Section;
void Clock;
void NOAH_LOGO;
void Mini;
void ArrowUpRight;
void ModulePreview;
