import React, { useEffect, useState } from 'react';
import {
  Eye,
  DollarSign,
  HardDrive,
  FileText,
  Clock,
  Play,
  Share2,
  Check,
  Plus,
  Trash2,
  Video as VideoIcon,
  Settings,
  Palette,
  Activity,
  Hourglass,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VidlyticsDatabaseService } from '@/services/VidlyticsDatabaseService';
import { sllDb } from '@/services/SLLDatabaseService';
import { supabase } from '@/lib/supabase';

interface OverviewTabProps {
  storeId: string;
  onNavigateTab: (tabKey: string) => void;
}

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export const VidlyticsOverviewTab: React.FC<OverviewTabProps> = ({ storeId, onNavigateTab }) => {
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState<string>('');
  const [appEnabled, setAppEnabled] = useState<boolean>(true);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Conversões
  const [videoRevenue, setVideoRevenue] = useState<number>(0);
  const [paidCount, setPaidCount] = useState<number>(0);
  const [pendingRevenue, setPendingRevenue] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [referralEarnings, setReferralEarnings] = useState<number>(0);

  // Quotas e Plano
  const [usage, setUsage] = useState({
    planName: 'PRO',
    subscriptionStatus: 'active',
    trialDaysLeft: null as number | null,
    currentPeriodEnd: null as string | null,
    viewsUsed: 0,
    viewsLimit: 10000,
    storageUsedMB: 120,
    storageLimitMB: 2048,
    pagesUsed: 1,
    pagesLimit: 5,
  });

  const [activities, setActivities] = useState<ActivityLog[]>([]);

  // Checklist
  const [checklist, setChecklist] = useState([
    { id: 'videos', title: 'Subir vídeos', description: 'Suba seus vídeos verticais ou importe do Instagram/TikTok.', tab: 'videos', completed: false },
    { id: 'stories', title: 'Criar coleção de Stories', description: 'Agrupe seus vídeos em coleções interativas.', tab: 'stories', completed: false },
    { id: 'appearance', title: 'Configurar a aparência', description: 'Personalize cores, bordas e botões do player.', tab: 'appearance', completed: false },
    { id: 'integration', title: 'Instalação do script', description: 'Copie e instale a Tag GTM no seu site.', tab: 'integration', completed: false },
  ]);

  useEffect(() => {
    if (!storeId) {
      // Se ainda não tem storeId, aguarda ou desativa loading após timeout
      const t = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(t);
    }
    let isMounted = true;

    const loadData = async () => {
      console.log('[VidlyticsOverviewTab] Iniciando loadData para storeId:', storeId);
      try {
        setLoading(true);

        const [storeRes, vidData, referralRes, settingsRes] = await Promise.allSettled([
          SLLDatabaseService.getStoreById(storeId),
          VidlyticsDatabaseService.getDashboardOverview(storeId),
          supabase.from('referral_rewards').select('amount').eq('referrer_store_id', storeId).eq('status', 'paid'),
          supabase.from('store_settings').select('*').eq('store_id', storeId).maybeSingle(),
        ]);

        if (!isMounted) return;

        // Dados da Loja
        if (storeRes.status === 'fulfilled' && storeRes.value) {
          setStoreName(storeRes.value.name || '');
        }

        // Settings
        if (settingsRes.status === 'fulfilled' && settingsRes.value.data) {
          setAppEnabled(settingsRes.value.data.widget_enabled !== false);
        }

        // Dados de Visão Geral do Vidlytics
        if (vidData.status === 'fulfilled' && vidData.value) {
          const vd = vidData.value;
          setVideoRevenue(vd.paidRevenue);
          setPaidCount(vd.paidCount);
          setPendingRevenue(vd.pendingRevenue);
          setPendingCount(vd.pendingCount);
          setActivities(vd.activities);

          setUsage((prev) => ({
            ...prev,
            viewsUsed: vd.viewsUsedMonth,
          }));

          // Atualizar Checklist
          setChecklist([
            { id: 'videos', title: 'Subir vídeos', description: 'Suba seus vídeos verticais ou importe do Instagram/TikTok.', tab: 'videos', completed: vd.videosCount > 0 },
            { id: 'stories', title: 'Criar coleção de Stories', description: 'Agrupe seus vídeos em coleções interativas.', tab: 'stories', completed: vd.storiesCount > 0 },
            { id: 'appearance', title: 'Configurar a aparência', description: 'Personalize cores, bordas e botões do player.', tab: 'appearance', completed: vd.appearancesCount > 0 },
            { id: 'integration', title: 'Instalação do script', description: 'Copie e instale a Tag GTM no seu site.', tab: 'integration', completed: vd.viewsUsedMonth > 0 },
          ]);
        }

        // Faturamento de indicações
        if (referralRes.status === 'fulfilled' && referralRes.value.data) {
          const totalRef = referralRes.value.data.reduce((acc: number, item: any) => acc + (Number(item.amount) || 0), 0);
          setReferralEarnings(totalRef);
        }
      } catch (err) {
        console.error('[VidlyticsOverviewTab] Erro ao carregar dados:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [storeId]);

  const handleCopyReferral = async () => {
    const referralUrl = `${window.location.origin}/register?ref=${storeId}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(referralUrl);
      }
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2000);
    } catch {
      // Fallback
    }
  };

  const calcPercent = (current: number, max: number) => {
    if (!max || max <= 0) return 0;
    return Math.min(100, Math.round((current / max) * 100));
  };

  const viewsPercent = calcPercent(usage.viewsUsed, usage.viewsLimit);
  const storagePercent = calcPercent(usage.storageUsedMB, usage.storageLimitMB);
  const pagesPercent = calcPercent(usage.pagesUsed, usage.pagesLimit);

  const completedSteps = checklist.filter((item) => item.completed).length;
  const checklistPercent = Math.round((completedSteps / checklist.length) * 100);

  const getBarColor = (pct: number) => {
    if (pct >= 90) return '!bg-[#ef4444]';
    if (pct >= 75) return '!bg-[#fd8539]';
    return '!bg-[#22c55e]';
  };

  const CHIP = {
    emerald: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30',
    rose: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30',
    blue: 'bg-blue-50 dark:bg-blue-950/40 text-[#0094eb] dark:text-[#fd8539] border border-blue-100 dark:border-orange-500/20',
    amber: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30',
    violet: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/30',
    slate: 'bg-slate-50 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800/30',
  };

  const getActivityMeta = (action: string) => {
    const act = action.toLowerCase();
    if (act.includes('video')) return { Icon: VideoIcon, label: 'Vídeo atualizado', chip: CHIP.emerald };
    if (act.includes('story') || act.includes('coleção')) return { Icon: Plus, label: 'Coleção de stories alterada', chip: CHIP.violet };
    if (act.includes('appearance') || act.includes('design')) return { Icon: Palette, label: 'Aparência do player atualizada', chip: CHIP.blue };
    if (act.includes('settings')) return { Icon: Settings, label: 'Configurações salvas', chip: CHIP.amber };
    if (act.includes('delete') || act.includes('remov')) return { Icon: Trash2, label: 'Item removido', chip: CHIP.rose };
    return { Icon: Activity, label: action || 'Atividade registrada', chip: CHIP.slate };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px]">
        <div className="w-9 h-9 border-4 border-[#0094eb] dark:border-[#fd8539] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Carregando visão geral do Vidlytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in font-sans">
      {/* ── 1. HEADER ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white dark:bg-slate-900 p-6 sm:p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="lg:col-span-2 flex flex-col justify-center space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-[#0094eb] dark:text-[#fd8539] bg-blue-50 dark:bg-[#fd8539]/10 px-3 py-1 rounded-full border border-blue-100 dark:border-[#fd8539]/25">
              Plano {usage.planName}
            </span>
            <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-700/40">
              Assinatura Ativa
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Olá, {storeName || 'Lojista'}
            </h1>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Acompanhe a performance dos vídeos e configure o widget no seu site.
            </p>
          </div>
        </div>

        {/* Card de Status do App */}
        <div className="lg:col-span-1 flex items-stretch">
          {appEnabled ? (
            <div className="w-full bg-emerald-500/[0.04] dark:bg-emerald-500/[0.03] border-2 border-emerald-500/25 rounded-2xl p-4 sm:p-5 flex flex-col justify-center space-y-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  Widget Vidlytics Ativo
                </span>
              </div>
              <p className="text-[11px] font-semibold text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                Seus vídeos estão online e sendo transmitidos publicamente no seu e-commerce.
              </p>
            </div>
          ) : (
            <div className="w-full bg-rose-500/[0.04] dark:bg-rose-500/[0.03] border-2 border-rose-500/25 rounded-2xl p-4 sm:p-5 flex flex-col justify-center space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500"></span>
                <span className="text-xs font-black text-rose-800 dark:text-rose-400 uppercase tracking-wider">
                  Widget Pausado
                </span>
              </div>
              <p className="text-[11px] font-semibold text-rose-700/80 dark:text-rose-400/80 leading-relaxed">
                Seus stories estão pausados e temporariamente ocultos para o público.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── 2. CARDS DE FATURAMENTO DOS VÍDEOS ── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-1">
          Resultados de Vendas Vindas dos Vídeos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Vendas Pagas */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Vendas Pagas
                </span>
                <span className="text-[10px] font-black uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  {paidCount} {paidCount === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(videoRevenue)}
              </h2>
              <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Faturamento confirmado via vídeos
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shrink-0">
              <CheckCircle2 size={24} className="stroke-[2.5]" />
            </div>
          </div>

          {/* Card 2: Pedidos Pendentes */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Aguardando Pagamento
                </span>
                <span className="text-[10px] font-black uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
                  {pendingCount} {pendingCount === 1 ? 'pedido' : 'pedidos'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pendingRevenue)}
              </h2>
              <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                Pix / Boletos em aberto
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 shrink-0">
              <Hourglass size={24} className="stroke-[2.5]" />
            </div>
          </div>

          {/* Card 3: Indicações */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Indicações Vidlytics
                </span>
                <span className="text-[10px] font-black uppercase bg-blue-50 dark:bg-[#fd8539]/15 text-[#0094eb] dark:text-[#fd8539] px-2 py-0.5 rounded-full border border-blue-200 dark:border-orange-500/30">
                  Comissões
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(referralEarnings)}
              </h2>
              <p className="text-[11px] font-medium text-[#0094eb] dark:text-[#fd8539]">
                Recompensas de indicação
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-[#fd8539]/15 text-[#0094eb] dark:text-[#fd8539] shrink-0">
              <DollarSign size={24} className="stroke-[2.5]" />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. CONSUMO DO PLANO ── */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3 px-1">
          Consumo do Plano
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card Views */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Visualizações</span>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-[#fd8539]/15 text-[#0094eb] dark:text-[#fd8539]">
                <Eye size={15} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {usage.viewsUsed.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">de {usage.viewsLimit.toLocaleString('pt-BR')}</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${getBarColor(viewsPercent)} rounded-full transition-all duration-500`} style={{ width: `${viewsPercent}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>Quota do mês</span>
              <span className={viewsPercent >= 90 ? 'text-rose-500 font-black' : 'text-[#0094eb] dark:text-[#fd8539]'}>{viewsPercent}%</span>
            </div>
          </div>

          {/* Card Armazenamento */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Armazenamento</span>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-[#fd8539]/15 text-[#0094eb] dark:text-[#fd8539]">
                <HardDrive size={15} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white">
                {usage.storageUsedMB >= 1024 ? `${(usage.storageUsedMB / 1024).toFixed(1)} GB` : `${usage.storageUsedMB} MB`}
              </span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">de {(usage.storageLimitMB / 1024).toFixed(0)} GB</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${getBarColor(storagePercent)} rounded-full transition-all duration-500`} style={{ width: `${storagePercent}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>Vídeos na nuvem</span>
              <span className={storagePercent >= 90 ? 'text-rose-500 font-black' : 'text-[#0094eb] dark:text-[#fd8539]'}>{storagePercent}%</span>
            </div>
          </div>

          {/* Card Páginas */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Páginas com Vídeos</span>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-[#fd8539]/15 text-[#0094eb] dark:text-[#fd8539]">
                <FileText size={15} />
              </div>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white">{usage.pagesUsed}</span>
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500">de {usage.pagesLimit} ativas</span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className={`h-full ${getBarColor(pagesPercent)} rounded-full transition-all duration-500`} style={{ width: `${pagesPercent}%` }} />
            </div>
            <div className="flex justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span>Locais de exibição</span>
              <span className={pagesPercent >= 90 ? 'text-rose-500 font-black' : 'text-[#0094eb] dark:text-[#fd8539]'}>{pagesPercent}%</span>
            </div>
          </div>

          {/* Card Status do Ciclo */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5 flex flex-col justify-between">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Ciclo da Conta</span>
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-[#fd8539]/15 text-[#0094eb] dark:text-[#fd8539]">
                <Clock size={15} />
              </div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Status</p>
              <p className="text-sm font-black text-slate-900 dark:text-white">Assinatura Ativa</p>
            </div>
            <div className="flex justify-between items-center text-[11px] font-bold text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-2">
              <span>Módulo:</span>
              <span className="text-[#0094eb] dark:text-[#fd8539]">Vidlytics SaaS</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. CHECKLIST + ATIVIDADES RECENTES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 items-stretch">
        {/* Checklist */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <div>
                <h2 className="text-sm font-black text-slate-800 dark:text-white">
                  Checklist de Publicação
                </h2>
                <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  Conclua os passos para rodar seus stories na loja.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      checklistPercent === 100 ? '!bg-[#22c55e]' : '!bg-[#0094eb] dark:!bg-[#fd8539]'
                    )}
                    style={{ width: `${checklistPercent}%` }}
                  />
                </div>
                <span className={cn('text-xs font-black', checklistPercent === 100 ? 'text-[#22c55e]' : 'text-[#0094eb] dark:text-[#fd8539]')}>
                  {checklistPercent}%
                </span>
              </div>
            </div>

            <div className="flex flex-col space-y-2.5">
              {checklist.map((item, index) => (
                <div
                  key={item.id}
                  onClick={() => onNavigateTab(item.tab)}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer group',
                    item.completed
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200/70 dark:border-emerald-800/30'
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-[#0094eb] dark:hover:border-[#fd8539]'
                  )}
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-black',
                      item.completed
                        ? 'bg-emerald-500 text-white'
                        : 'border-2 border-slate-300 dark:border-slate-600 text-slate-400 group-hover:border-[#0094eb] dark:group-hover:border-[#fd8539]'
                    )}
                  >
                    {item.completed ? '✓' : index + 1}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={cn('text-xs font-black', item.completed ? 'text-emerald-950 dark:text-emerald-300 line-through opacity-80' : 'text-slate-900 dark:text-white')}>
                        {item.title}
                      </h3>
                      <span className="text-[10px] font-bold text-[#0094eb] dark:text-[#fd8539] opacity-0 group-hover:opacity-100 transition-opacity">
                        Configurar &rarr;
                      </span>
                    </div>
                    <p className="text-[11px] mt-0.5 text-slate-500 dark:text-slate-400 truncate">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Atividade Recente */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <h2 className="text-sm font-black text-slate-800 dark:text-white">
                Atividade Recente (Log do Módulo)
              </h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                Histórico em tempo real das ações no Vidlytics.
              </p>
            </div>

            {activities.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs font-semibold">
                Nenhuma atividade recente registrada neste módulo.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[300px] overflow-y-auto pr-1">
                {activities.map((ev) => {
                  const meta = getActivityMeta(ev.action);
                  const MetaIcon = meta.Icon;

                  return (
                    <div key={ev.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                      <span className={cn('h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5', meta.chip)}>
                        <MetaIcon size={13} className="stroke-[2.5]" />
                      </span>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-700 dark:text-slate-200 block truncate">
                          {meta.label}
                          {ev.details && <span className="text-slate-900 dark:text-white font-normal">: {ev.details}</span>}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {new Date(ev.created_at).toLocaleDateString('pt-BR')} às {new Date(ev.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 5. BANNERS (ACADEMY & INDICAÇÃO) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-36 h-24 bg-slate-900 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0 group cursor-pointer">
            <img
              src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop"
              alt="Thumbnail"
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform"
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-9 h-9 rounded-full bg-[#0094eb] dark:bg-[#fd8539] text-white flex items-center justify-center shadow-md">
                <Play size={15} fill="white" className="ml-0.5" />
              </div>
            </div>
          </div>
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] font-black uppercase text-[#0094eb] dark:text-[#fd8539] bg-blue-50 dark:bg-[#fd8539]/10 px-2 py-0.5 rounded-full border border-blue-100 dark:border-[#fd8539]/20 inline-block">
              🎓 Vidlytics Academy
            </span>
            <h4 className="text-xs font-black text-slate-800 dark:text-white">
              Como dobrar conversões com Stories em 3 passos
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
              Aprenda as melhores práticas de posicionamento e gatilhos de CTA.
            </p>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#0094eb] dark:bg-[#fd8539] text-white">
                <DollarSign size={16} className="stroke-[2.5]" />
              </div>
              <h4 className="text-sm font-black text-slate-900 dark:text-white">Indique e Ganhe</h4>
            </div>
            <Share2 size={15} className="text-slate-400" />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 my-2">
            Receba comissões indicando o Vidlytics para outras lojas.
          </p>
          <button
            type="button"
            onClick={handleCopyReferral}
            className="w-full bg-[#0094eb] hover:bg-[#0082d1] dark:bg-[#fd8539] dark:hover:bg-[#e06e25] text-white font-black py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {copiedReferral ? (
              <>
                <Check size={14} className="stroke-[3]" />
                <span>Link Copiado!</span>
              </>
            ) : (
              <>
                <Share2 size={14} />
                <span>Copiar Link de Indicação</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VidlyticsOverviewTab;