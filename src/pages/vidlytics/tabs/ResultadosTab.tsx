import MarketStudyModal from '@/components/vidlytics/MarketStudyModal';
import VideoRetentionModal from '@/components/vidlytics/VideoRetentionModal';
import { supabase } from '@/lib/supabase';
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, Film, CheckSquare, Sparkles, HelpCircle, Hourglass, CheckCircle2, DollarSign, Wallet, Eye, MousePointerClick, Heart, MessageCircle, Percent, ArrowUpRight, TrendingDown, Compass, RefreshCw, Zap, Search, ChevronDown, Clock, Flame, LogOut, Volume2, Maximize2, Play, Share2, TrendingUp, Info } from 'lucide-react';
import { useLoja } from '../../../contexts/LojaContext';
import { VidlyticsDatabaseService, VidlyticsOverviewMetrics, VidlyticsVideoRow, VidlyticsRetentionRow, VidlyticsInsightRow } from '../../../services/vidlytics/VidlyticsDatabaseService';
import { AffiliateDatabaseService, AffiliateSummary } from '../../../services/AffiliateDatabaseService';
import { useNavigate } from 'react-router-dom';

type SubTab = 'visao-geral' | 'videos' | 'retencao' | 'insights';
type PeriodoKey = 'hoje' | '7' | '15' | '30' | 'custom';

function TrendBadge({ value, isPositive = true }: { value: string; isPositive?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
        isPositive ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'
      }`}
      title={`${isPositive ? '+' : '-'}${value} vs últimos 7 dias`}
    >
      {isPositive ? (
        <TrendingUp className="w-2.5 h-2.5 text-emerald-600" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5 text-rose-500" />
      )}
      <span>{isPositive ? '+' : ''}{value}</span>
    </span>
  );
}

function getDateRange(periodo: PeriodoKey, customStart?: string, customEnd?: string): { start: string; end: string } {
  const today = new Date();
  const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const end = ymd(today);

  if (periodo === 'custom' && customStart && customEnd) {
    return { start: customStart, end: customEnd };
  }

  let days = 30;
  if (periodo === 'hoje') days = 0;
  if (periodo === '7') days = 7;
  if (periodo === '15') days = 15;
  if (periodo === '30') days = 30;

  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - days);
  const start = ymd(startDate);

  return { start, end };
}

function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

const emptyMetrics: VidlyticsOverviewMetrics = {
  totalViews: 0,
  totalClicks: 0,
  totalConversions: 0,
  totalRevenue: 0,
  totalLikes: 0,
  totalComments: 0,
  ctr: 0,
  dailySeries: [],
};

export default function ResultadosTab() {
  const { storeId } = useLoja();
  const [sectorName, setSectorName] = useState('');
  const [retentionVideo, setRetentionVideo] = useState<{ id: string; title?: string | null; duration?: number | null } | null>(null);
  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
      const db: any = supabase;
      const { data: s } = await db.from('stores').select('sector, sector_id').eq('id', storeId).maybeSingle();
      let name = '';
      if (s?.sector_id) {
        const { data } = await db.from('sectors').select('name').eq('id', s.sector_id).maybeSingle();
        name = data?.name || '';
      }
      if (!name && s?.sector) {
        const { data } = await db.from('sectors').select('name').eq('slug', s.sector).maybeSingle();
        name = data?.name || '';
      }
      if (alive) setSectorName(name);
    })();
    return () => { alive = false; };
  }, [storeId]);
  const nicho = sectorName || 'e-commerce';
  const [studyOpen, setStudyOpen] = useState(false);
  const navigate = useNavigate();
  const [affiliateSummary, setAffiliateSummary] = useState<AffiliateSummary | null>(null);

  useEffect(() => {
    if (!storeId) return;
    AffiliateDatabaseService.getSummary(storeId).then(setAffiliateSummary);
  }, [storeId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  const [subTab, setSubTab] = useState<SubTab>('visao-geral');
  const [periodo, setPeriodo] = useState<PeriodoKey>('30');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchVideo, setSearchVideo] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [filtroFinanceiro, setFiltroFinanceiro] = useState('Todas Juntas');
  const [filtroEngajamento, setFiltroEngajamento] = useState('Todas Juntas');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const [metrics, setMetrics] = useState<VidlyticsOverviewMetrics>(emptyMetrics);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [videosList, setVideosList] = useState<VidlyticsVideoRow[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  const [retentionList, setRetentionList] = useState<VidlyticsRetentionRow[]>([]);
  const [retentionLoading, setRetentionLoading] = useState(false);
  const [insightsList, setInsightsList] = useState<VidlyticsInsightRow[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  type SortState = { key: string; dir: 'asc' | 'desc' } | null;
  const [sortVid, setSortVid] = useState<SortState>(null);
  const [sortRet, setSortRet] = useState<SortState>(null);

  const sortRows = <T,>(rows: T[], s: SortState): T[] => {
    if (!s) return rows;
    const k = s.key;
    return [...rows].sort((a: any, b: any) => {
      const x = a[k];
      const y = b[k];
      const r = typeof x === 'string' ? x.localeCompare(String(y ?? ''), 'pt-BR') : (Number(x) || 0) - (Number(y) || 0);
      return s.dir === 'asc' ? r : -r;
    });
  };
  const sortedVideos = useMemo(() => sortRows(videosList, sortVid), [videosList, sortVid]);
  const sortedRetention = useMemo(() => sortRows(retentionList, sortRet), [retentionList, sortRet]);

  const sortTh = (label: string, key: string, cur: SortState, set: (s: SortState) => void, left = false) => {
    const on = cur?.key === key;
    const first: 'asc' | 'desc' = key === 'title' ? 'asc' : 'desc';
    return (
      <th className={`${left ? 'text-left' : 'text-center'} px-4 py-3`}>
        <button
          type="button"
          onClick={() => set({ key, dir: on ? (cur!.dir === 'asc' ? 'desc' : 'asc') : first })}
          className={`inline-flex items-center gap-1 uppercase text-[10px] font-bold cursor-pointer hover:text-[#0094eb] ${on ? 'text-[#0094eb]' : ''}`}
        >
          {label}
          <span className="text-[9px]">{on ? (cur!.dir === 'asc' ? '\u25B2' : '\u25BC') : '\u2195'}</span>
        </button>
      </th>
    );
  };

  const { start, end } = useMemo(
    () => getDateRange(periodo, customStart, customEnd),
    [periodo, customStart, customEnd]
  );

  useEffect(() => {
    if (!storeId) return;
    if (periodo === 'custom' && (!customStart || !customEnd)) return;

    let active = true;
    setLoading(true);
    setErrorMsg(null);

    VidlyticsDatabaseService.getOverviewMetrics(storeId, start, end)
      .then((data) => {
        if (active) setMetrics(data);
      })
      .catch((err) => {
        console.error('Erro ao buscar métricas do Vidlytics:', err);
        if (active) setErrorMsg('Não foi possível carregar as métricas.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId, start, end, periodo]);

  useEffect(() => {
    if (!storeId || subTab !== 'videos') return;
    if (periodo === 'custom' && (!customStart || !customEnd)) return;

    let active = true;
    setVideosLoading(true);

    VidlyticsDatabaseService.getVideosPerformance(storeId, start, end)
      .then((data) => {
        if (active) setVideosList(data);
      })
      .catch((err) => {
        console.error('Erro ao buscar vídeos:', err);
      })
      .finally(() => {
        if (active) setVideosLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId, start, end, subTab]);

  useEffect(() => {
    if (!storeId || subTab !== 'retencao') return;
    if (periodo === 'custom' && (!customStart || !customEnd)) return;

    let active = true;
    setRetentionLoading(true);

    VidlyticsDatabaseService.getRetentionData(storeId, start, end)
      .then((data) => {
        if (active) setRetentionList(data);
      })
      .catch((err) => {
        console.error('Erro ao buscar retenção:', err);
      })
      .finally(() => {
        if (active) setRetentionLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId, start, end, subTab]);

  useEffect(() => {
    if (!storeId || subTab !== 'insights') return;
    if (periodo === 'custom' && (!customStart || !customEnd)) return;

    let active = true;
    setInsightsLoading(true);

    VidlyticsDatabaseService.getAiInsights(storeId, start, end)
      .then((data) => {
        if (active) setInsightsList(data);
      })
      .catch((err) => {
        console.error('Erro ao buscar insights:', err);
      })
      .finally(() => {
        if (active) setInsightsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [storeId, start, end, subTab]);

  const ctrFormatted = metrics.ctr.toFixed(1).replace('.', ',');
  const revenueFormatted = metrics.totalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const series = (() => {
    const byDate = new Map<string, VidlyticsOverviewMetrics['dailySeries'][number]>();
    metrics.dailySeries.forEach((d) => byDate.set(d.date, d));
    const out: VidlyticsOverviewMetrics['dailySeries'] = [];
    const [sy, sm, sd] = start.split('-').map(Number);
    const [ey, em, ed] = end.split('-').map(Number);
    const last = new Date(ey, em - 1, ed);
    for (let d = new Date(sy, sm - 1, sd); d <= last; d.setDate(d.getDate() + 1)) {
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      out.push(byDate.get(k) || { date: k, views: 0, clicks: 0, likes: 0, ctr: 0 });
    }
    return out;
  })();
  const showViews = filtroEngajamento === 'Todas Juntas' || filtroEngajamento === 'Visualizações';
  const showClicks = filtroEngajamento === 'Todas Juntas' || filtroEngajamento === 'Cliques CTA';
  const showLikes = filtroEngajamento === 'Todas Juntas' || filtroEngajamento === 'Curtidas';
  const peak = Math.max(
    0,
    ...series.map((d) => Math.max(showViews ? d.views : 0, showClicks ? d.clicks : 0, showLikes ? d.likes : 0))
  );
  const yMax = Math.max(3, Math.ceil(peak / 3) * 3);
  const yTicks = [0, 1, 2, 3].map((i) => ({ v: (yMax / 3) * i, y: 135 - ((135 - 20) * i) / 3 }));

  const buildPath = (values: number[], max: number, top = 20, bottom = 135) => {
    if (values.length === 0) return `M 50 ${bottom} L 870 ${bottom}`;
    const step = (870 - 50) / Math.max(1, values.length - 1);
    const points = values.map((v, i) => {
      const x = 50 + i * step;
      const y = bottom - (v / (max > 0 ? max : 1)) * (bottom - top);
      return `${x} ${y}`;
    });
    return `M ${points.join(' L ')}`;
  };

  const viewsPath = buildPath(series.map((d) => d.views), yMax);
  const clicksPath = buildPath(series.map((d) => d.clicks), yMax);
  const likesPath = buildPath(series.map((d) => d.likes), yMax);

  const PeriodoSelector = () => (
    <div className="flex items-center gap-2 self-start sm:self-auto">
      <div className="relative inline-block">
        <select
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value as PeriodoKey)}
          className="appearance-none bg-white border border-slate-200 text-xs font-semibold text-slate-700 py-2 pl-3.5 pr-8 rounded-xl shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
        >
          <option value="hoje">Hoje</option>
          <option value="7">7 dias</option>
          <option value="15">15 dias</option>
          <option value="30">30 dias</option>
          <option value="custom">Personalizado</option>
        </select>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {periodo === 'custom' && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={customStart}
            onChange={(e) => setCustomStart(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
          />
          <span className="text-xs text-slate-400">até</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => setCustomEnd(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
          />
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">

      {/* CABEÇALHO DA PÁGINA DE RESULTADOS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Resultados</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas reais de <strong className="text-[#0094eb] font-semibold">{nicho}</strong> comparadas aos benchmarks nacionais de 2026.
          </p>
        </div>

        <PeriodoSelector />
      </div>

      {/* PÍLULAS DE SUB-ABAS INTERNAS */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/60">
        <button
          onClick={() => setSubTab('visao-geral')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'visao-geral' ? 'bg-[#0094eb] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Visão Geral</span>
        </button>

        <button
          onClick={() => setSubTab('videos')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'videos' ? 'bg-[#0094eb] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>Vídeos</span>
        </button>

        <button
          onClick={() => setSubTab('retencao')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'retencao' ? 'bg-[#0094eb] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Retenção</span>
        </button>

        <button
          onClick={() => setSubTab('insights')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'insights' ? 'bg-[#0094eb] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>Insights</span>
        </button>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium px-4 py-3 rounded-xl">
          {errorMsg}
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. SUB-ABA: VISÃO GERAL */}
      {/* ========================================================= */}
      {subTab === 'visao-geral' && (
        <div className="space-y-6">

          {/* SEÇÃO RESULTADOS FINANCEIROS (mock, aguardando conexão com pedidos) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Resultados Financeiros
              </h3>
              <span className="text-[11px] text-slate-400 font-medium">Período: {formatDateBR(start)} a {formatDateBR(end)}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Aguardando Pagamento</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-amber-500">—</p>
                  <p className="text-xs text-slate-400">Sem integração de pedidos</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center border border-amber-100 flex-shrink-0">
                  <Hourglass className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Vendas Pagas</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-emerald-500">{formatCurrency(metrics.totalRevenue)}</p>
                  <p className="text-xs text-slate-400">{metrics.totalConversions} {metrics.totalConversions === 1 ? 'pedido confirmado' : 'pedidos confirmados'}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>

              <div onClick={() => navigate('/dashboard/afiliados')} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between cursor-pointer hover:border-purple-300 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Indicações</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(affiliateSummary?.available_balance || 0)}</p>
                  <p className="text-xs text-slate-400">Comissões disponíveis</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100 flex-shrink-0">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Total Gerado</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-[#0094eb]">{formatCurrency(metrics.totalRevenue + (affiliateSummary?.total_generated || 0))}</p>
                  <p className="text-xs text-slate-400">Vendas Pagas + Indicações</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#0094eb] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO PERFORMANCE DOS VÍDEOS & INTERAÇÃO DO PÚBLICO (DADOS REAIS) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                Performance dos Vídeos & Interação do Público
              </h3>
              {loading && <span className="text-[11px] text-slate-400 font-medium">Carregando...</span>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Visualizações */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Visualizações</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{metrics.totalViews.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-slate-400">Sessões de stories abertas</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100 flex-shrink-0">
                  <Eye className="w-4 h-4" />
                </div>
              </div>

              {/* Cliques em CTA */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Cliques em CTA</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{metrics.totalClicks.toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-slate-400">Cliques no card/botão de compra</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#fd8539] flex items-center justify-center border border-orange-100 flex-shrink-0">
                  <MousePointerClick className="w-4 h-4" />
                </div>
              </div>

              {/* Engajamento Social */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Engajamento Social</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <div className="flex items-center gap-4 pt-0.5">
                    <div>
                      <p className="text-xl font-bold text-rose-500">{metrics.totalLikes}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Curtidas</p>
                    </div>
                    <div>
                      <p className="text-xl font-bold text-[#0094eb]">{metrics.totalComments}</p>
                      <p className="text-[10px] text-slate-400 font-medium">Comentários</p>
                    </div>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center border border-rose-100 flex-shrink-0">
                  <Heart className="w-4 h-4" />
                </div>
              </div>

              {/* CTR (Taxa de Cliques) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">CTR (Taxa de Cliques)</span>
                    <HelpCircle className="w-3 h-3 text-slate-300 cursor-help" />
                  </div>
                  <p className="text-2xl font-bold text-slate-800">{ctrFormatted}%</p>
                  <p className="text-xs text-slate-400">Cliques sobre visualizações</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 flex-shrink-0">
                  <Percent className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* GRÁFICO EVOLUÇÃO DIÁRIA DE ENGAJAMENTO & FUNIL (DADOS REAIS) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-slate-700" />
                  <h4 className="text-sm font-bold text-slate-800">Evolução Diária de Engajamento & Funil de Vídeos</h4>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">Acompanhe o volume de visualizações, cliques e curtidas ao longo do tempo.</p>
              </div>

              <div className="flex items-center gap-1 overflow-x-auto text-xs font-semibold">
                {['Todas Juntas', 'Visualizações', 'Cliques CTA', 'Curtidas'].map((item) => (
                  <button
                    key={item}
                    onClick={() => setFiltroEngajamento(item)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      filtroEngajamento === item ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {metrics.dailySeries.length === 0 && !loading ? (
              <div className="w-full h-44 flex items-center justify-center text-xs text-slate-400">
                Sem dados suficientes para este período.
              </div>
            ) : (
              <div className="w-full h-44 relative pt-4">
                <div
                className="relative w-full h-full"
                onMouseLeave={() => setHoverIdx(null)}
                onMouseMove={(e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  const px = ((e.clientX - r.left) / r.width) * 900;
                  const stepX = (870 - 50) / Math.max(1, series.length - 1);
                  setHoverIdx(Math.max(0, Math.min(series.length - 1, Math.round((px - 50) / stepX))));
                }}
              >
                <svg className="w-full h-full overflow-visible" viewBox="0 0 900 140" preserveAspectRatio="none">
                  {yTicks.map((tk) => (
                    <line key={tk.y} x1="40" y1={tk.y} x2="880" y2={tk.y} stroke={tk.v === 0 ? '#e2e8f0' : '#f1f5f9'} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  ))}
                  {showViews && <path d={viewsPath} fill="none" stroke="#0094eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                  {showClicks && <path d={clicksPath} fill="none" stroke="#fd8539" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                  {showLikes && <path d={likesPath} fill="none" stroke="#f43f5e" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
                </svg>

                {yTicks.map((tk) => (
                  <span
                    key={`y${tk.v}`}
                    className="absolute left-0 w-[4.4%] pr-1 text-right text-[9px] font-mono text-slate-400 pointer-events-none"
                    style={{ top: `${(tk.y / 140) * 100}%`, transform: 'translateY(-50%)' }}
                  >
                    {tk.v}
                  </span>
                ))}

                {hoverIdx !== null && series[hoverIdx] && (() => {
                  const d = series[hoverIdx];
                  const lx = ((50 + hoverIdx * ((870 - 50) / Math.max(1, series.length - 1))) / 900) * 100;
                  const items = [
                    { show: showViews, val: d.views, color: '#0094eb', label: 'Visualizações' },
                    { show: showClicks, val: d.clicks, color: '#fd8539', label: 'Cliques em CTA' },
                    { show: showLikes, val: d.likes, color: '#f43f5e', label: 'Curtidas' },
                  ].filter((s) => s.show);
                  return (
                    <>
                      <div className="absolute top-0 bottom-0 w-px bg-slate-200 pointer-events-none" style={{ left: `${lx}%` }} />
                      {items.map((s) => (
                        <span
                          key={s.label}
                          className="absolute w-2.5 h-2.5 rounded-full border-2 border-white pointer-events-none"
                          style={{ left: `${lx}%`, top: `${((135 - (s.val / yMax) * 115) / 140) * 100}%`, background: s.color, transform: 'translate(-50%, -50%)' }}
                        />
                      ))}
                      <div
                        className="absolute z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-md pointer-events-none"
                        style={{ left: `${lx}%`, top: 0, transform: lx > 60 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}
                      >
                        <p className="mb-1 font-bold text-slate-700">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</p>
                        {items.map((s) => (
                          <p key={s.label} className="flex items-center gap-1.5 text-slate-600">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                            {s.label}: <strong>{s.val}</strong>
                          </p>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

                <div className="flex justify-between text-[9px] text-slate-400 font-mono mt-2 px-10">
                  {series.map((d, i) => (
                    <span key={d.date} className={i % Math.ceil(series.length / 8) === 0 ? '' : 'invisible'}>{d.date.slice(5).split('-').reverse().join('/')}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-6 pt-3 text-[11px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0094eb]"></span>
                <span>Visualizações</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#fd8539]"></span>
                <span>Cliques em CTA</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                <span>Curtidas</span>
              </div>
            </div>
          </div>

          {/* BANNER BENCHMARK DO SETOR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-[#0094eb] flex items-center justify-center border border-sky-100 flex-shrink-0">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-slate-800">Como funciona o benchmark do setor?</h5>
                <p className="text-xs text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
                  As metas de comparação do setor de <strong>{nicho}</strong> são baseadas em pesquisas consolidadas de mercado nacional de 2026 (Ebit/Nielsen, Neotrust e Social Commerce global).
                </p>
              </div>
            </div>

            <button type="button" onClick={() => setStudyOpen(true)} className="bg-[#0094eb] hover:bg-sky-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-xs flex-shrink-0">Ver Estudo de Mercado</button>
<MarketStudyModal open={studyOpen} onClose={() => setStudyOpen(false)} sector={nicho} />
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* 2. SUB-ABA: VÍDEOS */}
      {/* ========================================================= */}
      {subTab === 'videos' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Performance por Vídeo
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Período: {formatDateBR(start)} a {formatDateBR(end)}</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {videosLoading ? (
              <div className="p-16 text-center text-xs text-slate-400">Carregando vídeos...</div>
            ) : videosList.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Film className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Nenhum vídeo encontrado</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Não há vídeos cadastrados para este período.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
{sortTh('Vídeo', 'title', sortVid, setSortVid, true)}
{sortTh('Views', 'views', sortVid, setSortVid)}
{sortTh('Cliques', 'clicks', sortVid, setSortVid)}
{sortTh('CTR', 'ctr', sortVid, setSortVid)}
{sortTh('Curtidas', 'likes', sortVid, setSortVid)}
{sortTh('Comentários', 'comments', sortVid, setSortVid)}
{sortTh('Conversões', 'conversions', sortVid, setSortVid)}
{sortTh('Receita', 'revenue', sortVid, setSortVid)}
</tr>
                  </thead>
                  <tbody>
                    {sortedVideos.map((v) => (
                      <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 flex items-center gap-2">
                          {v.thumbnailUrl ? (
                            <img src={v.thumbnailUrl} alt={v.title} className="w-8 h-12 object-cover rounded-md" />
                          ) : (
                            <div className="w-8 h-12 bg-slate-100 rounded-md flex items-center justify-center">
                              <Play className="w-3 h-3 text-slate-400" />
                            </div>
                          )}
                          <span className="font-semibold text-slate-700 truncate max-w-[160px]">{v.title}</span>
                        </td>
                        <td className="text-center px-4 py-3 text-slate-600">{v.views.toLocaleString('pt-BR')}</td>
                        <td className="text-center px-4 py-3 text-slate-600">{v.clicks.toLocaleString('pt-BR')}</td>
                        <td className="text-center px-4 py-3 text-slate-600">{v.ctr.toFixed(1)}%</td>
                        <td className="text-center px-4 py-3 text-rose-500 font-semibold">{v.likes}</td>
                        <td className="text-center px-4 py-3 text-[#0094eb] font-semibold">{v.comments}</td>
                        <td className="text-center px-4 py-3 text-emerald-600 font-semibold">{v.conversions}</td>
                        <td className="text-center px-4 py-3 text-slate-700 font-bold">
                          {v.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. SUB-ABA: RETENÇÃO */}
      {/* ========================================================= */}
      {subTab === 'retencao' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Funil de Retenção por Vídeo
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Período: {formatDateBR(start)} a {formatDateBR(end)}</span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            {retentionLoading ? (
              <div className="p-16 text-center text-xs text-slate-400">Carregando dados de retenção...</div>
            ) : retentionList.length === 0 ? (
              <div className="p-16 text-center space-y-3">
                <Clock className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">Sem dados de retenção</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Não há métricas suficientes para este período.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-bold">
{sortTh('Vídeo', 'title', sortRet, setSortRet, true)}
{sortTh('Views', 'views', sortRet, setSortRet)}
{sortTh('Cliques', 'clicks', sortRet, setSortRet)}
{sortTh('Queda até o Clique', 'clickDropRate', sortRet, setSortRet)}
{sortTh('Conversões', 'conversions', sortRet, setSortRet)}
{sortTh('Queda até a Conversão', 'conversionDropRate', sortRet, setSortRet)}
<th className="text-center px-4 py-3">Ações</th>
</tr>
                  </thead>
                  <tbody>
                    {sortedRetention.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 flex items-center gap-2">
                          {r.thumbnailUrl ? (
                            <img src={r.thumbnailUrl} alt={r.title} className="w-8 h-12 object-cover rounded-md" />
                          ) : (
                            <div className="w-8 h-12 bg-slate-100 rounded-md flex items-center justify-center">
                              <Play className="w-3 h-3 text-slate-400" />
                            </div>
                          )}
                          <span className="font-semibold text-slate-700 truncate max-w-[160px]">{r.title}</span>
                        </td>
                        <td className="text-center px-4 py-3 text-slate-600">{r.views.toLocaleString('pt-BR')}</td>
                        <td className="text-center px-4 py-3 text-slate-600">{r.clicks.toLocaleString('pt-BR')}</td>
                        <td className="text-center px-4 py-3 text-rose-500 font-semibold">{r.clickDropRate.toFixed(1)}%</td>
                        <td className="text-center px-4 py-3 text-emerald-600 font-semibold">{r.conversions.toLocaleString('pt-BR')}</td>
                        <td className="text-center px-4 py-3 text-rose-500 font-semibold">{r.conversionDropRate.toFixed(1)}%</td>
                        <td className="text-center px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setRetentionVideo({ id: r.id, title: r.title })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-[11px] font-bold text-sky-600 hover:bg-sky-100"
                          >
                            <BarChart3 className="w-3.5 h-3.5" />
                            Métricas
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SUB-ABA: INSIGHTS */}
      {/* ========================================================= */}
      {retentionVideo && (
        <VideoRetentionModal
          open={!!retentionVideo}
          onOpenChange={(o) => { if (!o) setRetentionVideo(null); }}
          storeId={storeId || ''}
          video={retentionVideo}
          start={start}
          end={end}
        />
      )}

      {subTab === 'insights' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              Insights de IA
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Período: {formatDateBR(start)} a {formatDateBR(end)}</span>
          </div>

          {insightsLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-16 text-center text-xs text-slate-400">
              Carregando insights...
            </div>
          ) : insightsList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-16 text-center space-y-3">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">Nenhum insight gerado</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">Ainda não há insights de IA para este período.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insightsList.map((insight) => (
                <div key={insight.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
                    {insight.videoTitle && (
                      <span className="text-[10px] font-bold text-slate-400 uppercase truncate">{insight.videoTitle}</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{insight.insightText}</p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(insight.createdAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

