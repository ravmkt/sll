import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoja } from '../../../contexts/LojaContext';
import { useCardTip } from '@/hooks/useCardTip';
import VidlyticsAcademy from '../../../components/vidlytics/VidlyticsAcademy';
import ProximasDatasComerciais from '../../../components/vidlytics/ProximasDatasComerciais';
import { supabase } from '@/lib/supabase';
import { AffiliateDatabaseService, AffiliateSummary } from '../../../services/AffiliateDatabaseService';
import { VidlyticsDatabaseService } from '../../../services/vidlytics/VidlyticsDatabaseService';
import { getActiveSubscriptions } from '../../../services/subscriptions/getStoreSubscriptions';
import { 
  CheckCircle2, 
  Hourglass, 
  DollarSign, 
  Eye, 
  HardDrive, 
  FileText, 
  Clock, 
  Share2, 
  Link2, 
  Check, 
  Settings, 
  Palette, 
  Edit3, 
  ArrowRight
} from 'lucide-react';
import { Activity, TrendingUp, TrendingDown, Trophy, AlertTriangle, GraduationCap } from 'lucide-react';

type Periodo = 'today' | '7' | '30' | 'custom';

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: 'today', label: 'Hoje' },
  { key: '7', label: '7 dias' },
  { key: '30', label: '30 dias' },
  { key: 'custom', label: 'Personalizado' },
];

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function getRange(p: Periodo, customStart: string, customEnd: string) {
  if (p === 'custom') return { start: customStart, end: customEnd };
  const start = new Date();
  if (p !== 'today') start.setDate(start.getDate() - (Number(p) - 1));
  return { start: ymd(start), end: ymd(new Date()) };
}

type PerfRow = Awaited<ReturnType<typeof VidlyticsDatabaseService.getVideosPerformance>>[number];

const VIEWS_LIMIT = 60000;
const STORAGE_LIMIT_DEFAULT = 50 * 1024 * 1024 * 1024;

const fmtBytes = (b: number) => {
  if (!b) return '0 MB';
  const mb = b / 1048576;
  if (mb < 1024) return `${mb.toFixed(1).replace('.', ',')} MB`;
  return `${(mb / 1024).toFixed(1).replace('.', ',')} GB`;
};
const CHANNEL_URL = (import.meta.env.VITE_ACADEMY_CHANNEL_URL as string | undefined) || 'https://www.youtube.com';

const ACADEMY_TIPS: Record<number, { title: string; text: string }> = {
  0: { title: 'Volta às aulas e liquidação', text: 'Use vídeos curtos de "look pronto" e destaque o produto com maior CTR nas páginas de liquidação.' },
  1: { title: 'Carnaval e Dia da Mulher', text: 'Monte um Story com os produtos de festa e outro de presente para o Dia da Mulher.' },
  2: { title: 'Dia da Mulher e Páscoa', text: 'Crie Stories de presente com preço visível e botão direto para o produto.' },
  3: { title: 'Páscoa e Dia das Mães', text: 'Comece a aquecer o Dia das Mães: vídeos de presente por faixa de preço convertem melhor.' },
  4: { title: 'Dia das Mães e Namorados', text: 'Mostre o produto em uso e coloque o WhatsApp como CTA para tirar dúvidas de presente.' },
  5: { title: 'Dia dos Namorados', text: 'Kits para casais e vídeos de 15 segundos funcionam bem. Teste o flutuante na home.' },
  6: { title: 'Preparação para o Dia dos Pais', text: 'Crie uma coleção de presentes para pais e revise os vídeos com CTR abaixo de 2%.' },
  7: { title: 'Dia dos Pais', text: 'Fixe o Story de presentes no topo da home e acompanhe o CTR dia a dia.' },
  8: { title: 'Dia do Cliente e Dia das Crianças', text: 'Aproveite o Dia do Cliente para recompra e já prepare os vídeos do Dia das Crianças.' },
  9: { title: 'Dia das Crianças e Black Friday', text: 'Destaque os vídeos de maior CTR nos produtos mais vendidos e comece a aquecer a Black Friday.' },
  10: { title: 'Black Friday', text: 'Poucos vídeos, ofertas claras e CTA direto. Troque os vídeos sem clique antes da data.' },
  11: { title: 'Natal e Réveillon', text: 'Mostre prazos de entrega nos vídeos e priorize produtos de pronta-entrega.' },
};

const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const fmtInt = (n: number) => (n || 0).toLocaleString('pt-BR');
const fmtPct = (n: number) => `${(n || 0).toFixed(1).replace('.', ',')}%`;

const totals = (rows: PerfRow[]) => {
  const views = rows.reduce((s, r) => s + r.views, 0);
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  return { views, clicks, ctr: views > 0 ? (clicks / views) * 100 : 0 };
};

const goTab = (tab: string, sub?: string) => window.dispatchEvent(new CustomEvent('vidlytics:goto-tab', { detail: sub ? { tab, sub } : tab }));

function Delta({ cur, prev }: { cur: number; prev: number }) {
  if (prev <= 0) return <span className="text-[11px] text-slate-400">{cur > 0 ? 'Novo no período' : 'Sem dados anteriores'}</span>;
  const v = ((cur - prev) / prev) * 100;
  const up = v >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-bold ${up ? 'text-emerald-600' : 'text-rose-600'}`}>
      <Icon className="w-3 h-3" />
      {up ? '+' : ''}{v.toFixed(1).replace('.', ',')}% vs. anterior
    </span>
  );
}

function CardTitle({ icon: Icon, children }: { icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-[#0094eb]/10 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[#0094eb]" />
      </div>
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">{children}</h3>
    </div>
  );
}

export default function VisaoGeralTab() {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  useCardTip();
  const { storeId, store } = useLoja();
  const [affiliateSummary, setAffiliateSummary] = useState<AffiliateSummary | null>(null);

  const [appEnabled, setAppEnabled] = useState(true);
  const [appLoading, setAppLoading] = useState(true);
  const [appSaving, setAppSaving] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  useEffect(() => {
    if (!storeId) return;
    setAppLoading(true);
    supabase
      .from('store_settings')
      .select('app_enabled, widget_enabled')
      .eq('store_id', storeId)
      .maybeSingle()
      .then(({ data }) => {
        setAppEnabled(data ? data.app_enabled !== false && data.widget_enabled !== false : true);
      })
      .finally(() => setAppLoading(false));
  }, [storeId]);

  const [replyName, setReplyName] = useState('');

  useEffect(() => {
    if (!storeId) return;
    supabase
      .from('store_settings')
      .select('reply_display_name')
      .eq('store_id', storeId)
      .maybeSingle()
      .then(({ data }) => setReplyName((((data as any)?.reply_display_name as string) || '').trim()));
  }, [storeId]);

  const handleToggleApp = async () => {
    if (!storeId || appSaving || appLoading) return;
    const next = !appEnabled;
    setAppEnabled(next);
    setAppSaving(true);
    setAppError(null);
    const { data, error } = await supabase
      .from('store_settings')
      .update({ app_enabled: next, widget_enabled: next })
      .eq('store_id', storeId)
      .select('store_id');
    if (error || !data || data.length === 0) {
      setAppEnabled(!next);
      setAppError('Não foi possível salvar. Tente novamente.');
    }
    setAppSaving(false);
  };

  useEffect(() => {
    if (!storeId) return;
    AffiliateDatabaseService.getSummary(storeId).then(setAffiliateSummary);
  }, [storeId]);

  const [periodo, setPeriodo] = useState<Periodo>('30');
  const [customStart, setCustomStart] = useState(() => ymd(new Date(Date.now() - 29 * 86400000)));
  const [customEnd, setCustomEnd] = useState(() => ymd(new Date()));
  const [paid, setPaid] = useState({ revenue: 0, orders: 0 });
  const [paidLoading, setPaidLoading] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    const { start, end } = getRange(periodo, customStart, customEnd);
    if (!start || !end || start > end) return;
    let alive = true;
    setPaidLoading(true);
    VidlyticsDatabaseService.getOverviewMetrics(storeId, start, end)
      .then((m) => { if (!alive) return; setPaid({ revenue: m.totalRevenue || 0, orders: m.totalConversions || 0 }); setSeries((m.dailySeries || []).map((d) => ({ date: d.date, views: d.views, clicks: d.clicks, ctr: d.ctr }))); })
      .catch(() => { if (alive) setPaid({ revenue: 0, orders: 0 }); })
      .finally(() => { if (alive) setPaidLoading(false); });
    return () => { alive = false; };
  }, [storeId, periodo, customStart, customEnd]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

  const [, setSeries] = useState<{ date: string; views: number; clicks: number; ctr: number }[]>([]);
  const [curRows, setCurRows] = useState<PerfRow[]>([]);
  const [prevRows, setPrevRows] = useState<PerfRow[]>([]);
  const [perfLoading, setPerfLoading] = useState(false);
  const [health, setHealth] = useState<{ videos: number; views30: number; views7: number; month: number; idle: number } | null>(null);

  useEffect(() => {
    if (!storeId) return;
    const { start, end } = getRange(periodo, customStart, customEnd);
    if (!start || !end || start > end) return;
    const s = new Date(start + 'T00:00:00');
    const e = new Date(end + 'T00:00:00');
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    const pEnd = ymd(addDays(s, -1));
    const pStart = ymd(addDays(s, -days));
    let alive = true;
    setPerfLoading(true);
    Promise.all([
      VidlyticsDatabaseService.getVideosPerformance(storeId, start, end),
      VidlyticsDatabaseService.getVideosPerformance(storeId, pStart, pEnd),
    ])
      .then(([c, p]) => { if (!alive) return; setCurRows(c); setPrevRows(p); })
      .catch(() => { if (!alive) return; setCurRows([]); setPrevRows([]); })
      .finally(() => { if (alive) setPerfLoading(false); });
    return () => { alive = false; };
  }, [storeId, periodo, customStart, customEnd]);

  useEffect(() => {
    if (!storeId) return;
    const now = new Date();
    const today = ymd(now);
    const d7 = ymd(addDays(now, -6));
    const d30 = ymd(addDays(now, -29));
    const m1 = ymd(new Date(now.getFullYear(), now.getMonth(), 1));
    let alive = true;
    Promise.all([
      VidlyticsDatabaseService.getVideosPerformance(storeId, d30, today),
      VidlyticsDatabaseService.getVideosPerformance(storeId, d7, today),
      VidlyticsDatabaseService.getVideosPerformance(storeId, m1, today),
    ])
      .then(([r30, r7, rm]) => {
        if (!alive) return;
        setHealth({
          videos: r30.length,
          views30: totals(r30).views,
          views7: totals(r7).views,
          month: totals(rm).views,
          idle: r30.filter((v) => v.status === 'active' && v.views === 0).length,
        });
      })
      .catch(() => { /* mantem sem alertas se a consulta falhar */ });
    return () => { alive = false; };
  }, [storeId]);

  const [planName, setPlanName] = useState('');
  const [cycle, setCycle] = useState<{ status: string; label: string; date: string } | null>(null);
  const [storageBytes, setStorageBytes] = useState<number | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    const st = store as any;
    getActiveSubscriptions(storeId)
      .then((subs: any[]) => {
        if (!alive) return;
        const sub = (subs || []).find((s) => s.module_key === 'vidlytics' || (s.plan?.modules ?? []).includes('vidlytics')) ?? (subs || [])[0];
        if (sub) {
          const map: Record<string, string> = { active: 'Ativo', trialing: 'Período de teste', past_due: 'Em atraso', canceled: 'Cancelado' };
          setPlanName(String(sub.plan?.name || 'Plano ativo'));
          setCycle({
            status: map[String(sub.status)] || 'Ativo',
            label: 'Renovação:',
            date: sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : '—',
          });
          return;
        }
        const trialEnd = st?.trial_ends_at ? new Date(st.trial_ends_at) : null;
        if (trialEnd && trialEnd.getTime() > Date.now()) {
          setPlanName('Período de teste');
          setCycle({ status: 'Período de teste', label: 'Teste até:', date: trialEnd.toLocaleDateString('pt-BR') });
        } else {
          setPlanName('');
          setCycle({ status: 'Sem assinatura ativa', label: 'Renovação:', date: '—' });
        }
      })
      .catch(() => { if (alive) setCycle({ status: '—', label: 'Renovação:', date: '—' }); });
    return () => { alive = false; };
  }, [storeId, store]);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    VidlyticsDatabaseService.getVideos(storeId)
      .then((rows: any[]) => {
        if (!alive) return;
        const bytes = (rows || [])
          .filter((v) => v.store_id === storeId)
          .reduce((s, v) => s + (Number(v.file_size_bytes ?? v.file_size) || 0), 0);
        setStorageBytes(bytes);
      })
      .catch(() => { if (alive) setStorageBytes(0); });
    return () => { alive = false; };
  }, [storeId]);

  useEffect(() => {
    if (!storeId) return;
    let alive = true;
    (async () => {
      const since = ymd(addDays(new Date(), -29));
      const paths = new Set<string>();
      for (const col of ['page_path', 'page_url']) {
        paths.clear();
        let failed = false;
        for (let p = 0; p < 5; p++) {
          const { data, error } = await (supabase as any)
            .from('store_activity_events')
            .select(col)
            .eq('store_id', storeId)
            .eq('event_type', 'video_view')
            .gte('created_at', since)
            .range(p * 1000, p * 1000 + 999);
          if (error) { failed = true; break; }
          (data || []).forEach((r: any) => {
            const raw = String(r[col] || '').split('?')[0].split('#')[0];
            if (!raw) return;
            try { paths.add(raw.startsWith('http') ? new URL(raw).pathname : raw); } catch { paths.add(raw); }
          });
          if (!data || data.length < 1000) break;
        }
        if (!failed) break;
      }
      if (alive) setPageCount(paths.size);
    })();
    return () => { alive = false; };
  }, [storeId]);

  const storageLimit = Number((store as any)?.storage_limit_bytes) > 0 ? Number((store as any).storage_limit_bytes) : STORAGE_LIMIT_DEFAULT;

  const tc = totals(curRows);
  const tp = totals(prevRows);
  const top3 = [...curRows].filter((r) => r.views > 0).sort((a, b) => b.views - a.views).slice(0, 3);


  const alerts: { tone: 'warn' | 'danger'; text: string }[] = [];
  if (!appEnabled) alerts.push({ tone: 'danger', text: 'O aplicativo está desativado: seus vídeos estão ocultos na loja.' });
  if (appEnabled && health && health.videos > 0 && health.views7 === 0) alerts.push({ tone: 'warn', text: 'Sem visualizações nos últimos 7 dias. Confira se o script está instalado na loja.' });
  if (health && health.idle > 0) alerts.push({ tone: 'warn', text: `${health.idle} ${health.idle === 1 ? 'vídeo ativo sem visualizações' : 'vídeos ativos sem visualizações'} em 30 dias.` });
  if (health && health.month >= VIEWS_LIMIT * 0.8) alerts.push({ tone: 'danger', text: `Você usou ${Math.round((health.month / VIEWS_LIMIT) * 100)}% da cota mensal de visualizações. Fale com o suporte para ampliar o plano.` });

  const academyTip = ACADEMY_TIPS[new Date().getMonth()];

  const handleCopyLink = () => {
    navigator.clipboard.writeText(store?.referral_code ? (window.location.origin + '/?ref=' + store.referral_code) : 'https://vidlytics.com.br/indica/useanny');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* 1. Header: boas-vindas, plano e status do app */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-slate-700 truncate">
            Bem-vindo(a){replyName ? ` ${replyName}` : ''}
          </p>
          <span className="inline-block px-2.5 py-0.5 text-[11px] font-bold rounded-md bg-[#0094eb]/10 text-[#0094eb] uppercase tracking-wide">{planName || 'Sem plano ativo'}</span>
        </div>

        {/* Seletor do Aplicativo */}
        <div
          className={`rounded-lg px-3 py-2 flex items-center gap-3 border transition-colors ${
            appEnabled ? 'bg-emerald-50/70 border-emerald-200/80' : 'bg-rose-50/70 border-rose-200/80'
          }`}
        >
          <div className="min-w-0">
            <h4
              className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                appEnabled ? 'text-emerald-900' : 'text-rose-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${appEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
              {appEnabled ? 'Aplicativo Ativado' : 'Aplicativo Desativado'}
            </h4>
            <p className={`text-[11px] mt-0.5 truncate ${appEnabled ? 'text-emerald-700' : 'text-rose-700'}`}>
              {appError ? appError : appEnabled ? 'Vídeos online na sua loja.' : 'Vídeos ocultos na sua loja.'}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={appEnabled}
            aria-label="Ativar ou desativar o aplicativo"
            disabled={appLoading || appSaving}
            onClick={handleToggleApp}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-wait ${
              appEnabled ? 'bg-emerald-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                appEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. Faturamento */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Faturamento</h3>
          <div className="flex flex-wrap items-center gap-2">
            {periodo === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStart}
                  max={customEnd}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={customEnd}
                  min={customStart}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 px-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700"
                />
              </>
            )}
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5">
              {PERIODOS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setPeriodo(p.key)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                    periodo === p.key ? 'bg-[#0094eb] text-white shadow-sm' : 'text-slate-500 hover:text-[#0094eb]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card: Vendas Pagas */}
          <div data-card-tip="Soma dos pedidos com pagamento confirmado e atribuídos aos seus vídeos no período selecionado." className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-slate-400">Vendas Pagas</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">{paid.orders} {paid.orders === 1 ? 'Pedido' : 'Pedidos'}</span>
              </div>
              <p className={`text-2xl font-black text-slate-800 ${paidLoading ? 'opacity-50' : ''}`}>{formatCurrency(paid.revenue)}</p>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                Faturamento confirmado →
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
          </div>

          {/* Card: Aguardando Pagamento */}
          <div data-card-tip="Pedidos iniciados a partir dos seus vídeos que ainda não tiveram o pagamento confirmado." className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-slate-400">Aguardando Pagamento</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-700">0 Pedidos</span>
              </div>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(0)}</p>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                Pix / Boleto pendente →
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0">
              <Hourglass className="w-6 h-6 text-amber-500" />
            </div>
          </div>

          {/* Card: Faturamento Indicações */}
          <div data-card-tip="Comissões disponíveis das lojas que você indicou. Veja os detalhes em Indica & Ganha." className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-slate-400">Faturamento Indicações</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-[#0094eb]">
                  Comissões
                </span>
              </div>
              <p className="text-2xl font-black text-slate-800">{formatCurrency(affiliateSummary?.available_balance || 0)}</p>
              <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                Ver detalhes no Indica & Ganha →
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0">
              <DollarSign className="w-6 h-6 text-[#0094eb]" />
            </div>
          </div>

        </div>
      </div>

      {/* 3. Consumo do Plano */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
          Consumo do Plano
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Visualizações */}
          <div data-card-tip="Visualizações dos seus vídeos no mês atual em relação à cota do seu plano." className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">Visualizações</span>
              <Eye className="w-4 h-4 text-[#0094eb]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{fmtInt(health?.month ?? 0)}</span>
              <span className="text-xs text-slate-400 font-medium">de {fmtInt(VIEWS_LIMIT)}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Quota do mês</span>
              <span className="font-semibold text-slate-700">{Math.round(((health?.month ?? 0) / VIEWS_LIMIT) * 100)}%</span>
            </div>
          </div>

          {/* Armazenamento */}
          <div data-card-tip="Espaço ocupado pelos vídeos hospedados na sua conta em relação ao limite do plano." className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">Armazenamento</span>
              <HardDrive className="w-4 h-4 text-[#0094eb]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{fmtBytes(storageBytes ?? 0)}</span>
              <span className="text-xs text-slate-400 font-medium">de {fmtBytes(storageLimit)}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Vídeos na nuvem</span>
              <span className="font-semibold text-slate-700">{Math.min(100, Math.round(((storageBytes ?? 0) / storageLimit) * 100))}%</span>
            </div>
          </div>

          {/* Páginas com Vídeos */}
          <div data-card-tip="Páginas da sua loja onde os vídeos estão sendo exibidos, em relação ao limite do plano." className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">Páginas com Vídeos</span>
              <FileText className="w-4 h-4 text-[#0094eb]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-800">{fmtInt(pageCount ?? 0)}</span>
              <span className="text-xs text-slate-400 font-medium">com visualização em 30 dias</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Locais de exibição</span>
              <span className="font-semibold text-slate-700">30 dias</span>
            </div>
          </div>

          {/* Ciclo da Conta */}
          <div data-card-tip="Situação da sua assinatura e data da próxima renovação." className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all space-y-3">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-bold uppercase">Ciclo da Conta</span>
              <Clock className="w-4 h-4 text-[#0094eb]" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Status</span>
              <span className="text-xl font-black text-slate-800">{cycle?.status ?? '...'}</span>
            </div>
            <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>{cycle?.label ?? 'Renovação:'}</span>
              <span className="font-medium text-slate-600">{cycle?.date ?? '—'}</span>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Desempenho + Datas comerciais (alinhados) / Dica + Indique */}
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Desempenho dos videos */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4 flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <CardTitle icon={Activity}>Desempenho dos vídeos</CardTitle>
                <button type="button" onClick={() => goTab('resultados', 'videos')} className="text-[11px] font-semibold text-[#0094eb] hover:underline cursor-pointer whitespace-nowrap">
                  Ver mais métricas →
                </button>
              </div>
              <div className={`flex-1 content-center grid grid-cols-1 sm:grid-cols-3 gap-3 ${perfLoading ? 'opacity-50' : ''}`}>
                <div data-card-tip="Total de visualizações dos vídeos no período, comparado ao período anterior de mesma duração." className="rounded-xl border border-slate-100 p-3 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Visualizações</span>
                  <p className="text-xl font-black text-slate-800">{fmtInt(tc.views)}</p>
                  <Delta cur={tc.views} prev={tp.views} />
                </div>
                <div data-card-tip="Cliques nos botões e produtos dentro dos vídeos no período, comparado ao período anterior." className="rounded-xl border border-slate-100 p-3 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">Cliques</span>
                  <p className="text-xl font-black text-slate-800">{fmtInt(tc.clicks)}</p>
                  <Delta cur={tc.clicks} prev={tp.clicks} />
                </div>
                <div data-card-tip="Cliques divididos por visualizações. Mostra quantos espectadores agem depois de assistir." className="rounded-xl border border-slate-100 p-3 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400">CTR</span>
                  <p className="text-xl font-black text-slate-800">{fmtPct(tc.ctr)}</p>
                  <Delta cur={tc.ctr} prev={tp.ctr} />
                </div>
              </div>
            </div>

            {/* Videos mais vistos */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-4">
              <CardTitle icon={Trophy}>Vídeos mais assistidos</CardTitle>
              {top3.length === 0 ? (
                <p className="text-xs text-slate-500">{perfLoading ? 'Carregando...' : 'Nenhuma visualização no período selecionado.'}</p>
              ) : (
                <div className="space-y-2">
                  {top3.map((v, idx) => (
                    <div key={v.id} className="flex items-center gap-3 p-2 rounded-xl border border-slate-100">
                      <span className="w-5 text-center text-xs font-black text-slate-400">{idx + 1}</span>
                      {v.thumbnailUrl ? (
                        <img src={v.thumbnailUrl} alt="" className="w-10 h-14 rounded-lg object-cover bg-slate-100 shrink-0" />
                      ) : (
                        <div className="w-10 h-14 rounded-lg bg-slate-100 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{v.title}</p>
                        <p className="text-[11px] text-slate-500">{fmtInt(v.views)} views · {fmtInt(v.clicks)} cliques</p>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-700">CTR {fmtPct(v.ctr)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Datas comerciais: na altura das duas colunas da esquerda, com rolagem interna */}
          <div className="relative">
            <div className="lg:absolute lg:inset-0">
              <ProximasDatasComerciais />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dica da Academy */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm h-full flex flex-col justify-between gap-4">
            <CardTitle icon={GraduationCap}>Dica da Academy</CardTitle>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-xs font-bold text-slate-800">{academyTip.title}</p>
              <p className="text-xs text-slate-500 leading-relaxed mt-1">{academyTip.text}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#fd8539]/60 p-5 shadow-sm h-full flex flex-col justify-between hover:border-[#fd8539] transition-all space-y-4">
          <div className="flex items-center justify-between">
            <img src="/assets/clube-sll-b.png" alt="Indique e Ganhe" className="h-8 w-auto object-contain" />
            <Share2 className="w-4 h-4 text-slate-400" />
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Receba comissões e benefícios ao indicar o Vidlytics para outros lojistas.
          </p>

          <div className="space-y-2">
            <button
              onClick={handleCopyLink}
              className="w-full py-2.5 px-4 rounded-xl bg-[#fd8539] hover:bg-[#e07128] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm active:scale-[0.99]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  LINK COPIADO!
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  COPIAR MEU LINK DE INDICAÇÃO
                </>
              )}
            </button>

            <div className="text-center">
              <a 
                href="/dashboard/afiliados"
                onClick={(e) => { e.preventDefault(); navigate('/dashboard/afiliados'); }}
                className="text-[11px] font-semibold text-slate-500 hover:text-[#fd8539] transition-colors inline-flex items-center gap-1"
              >
                Acessar painel de indicações →
              </a>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* 5. Vidlytics Academy */}
      <VidlyticsAcademy />

    </div>
  );
}
