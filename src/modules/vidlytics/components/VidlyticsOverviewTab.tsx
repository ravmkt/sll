import React, { useEffect, useState } from 'react';
import { 
  Eye, 
  MousePointerClick, 
  ShoppingBag, 
  TrendingUp, 
  Play, 
  ArrowUpRight, 
  AlertCircle, 
  Loader2, 
  Store as StoreIcon 
} from 'lucide-react';
import { SLLDatabaseService, Store } from '../../../services/SLLDatabaseService';
import { VidlyticsDatabaseService, OverviewMetrics, VideoItem } from '../../../services/VidlyticsDatabaseService';

export const VidlyticsOverviewTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<OverviewMetrics>({
    totalViews: 0,
    totalCtaClicks: 0,
    totalProductClicks: 0,
    estimatedRevenue: 0,
  });

  const [videos, setVideos] = useState<VideoItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const store = await SLLDatabaseService.getActiveStore();

      if (!store) {
        setActiveStore(null);
        return;
      }

      setActiveStore(store);

      const [metricsData, videosData] = await Promise.all([
        VidlyticsDatabaseService.getStoreMetrics(store.id),
        VidlyticsDatabaseService.getVideos(store.id, 5)
      ]);

      setMetrics(metricsData);
      setVideos(videosData);
    } catch (err: any) {
      console.error('Erro ao carregar Visão Geral:', err);
      setErrorMessage(err.message || 'Falha ao carregar informações da loja.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-[#0094eb] mb-3" />
        <p className="text-sm font-medium">Buscando informações da sua loja...</p>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-3 text-red-600 dark:text-red-400">
        <AlertCircle className="w-6 h-6 flex-shrink-0" />
        <div>
          <p className="font-semibold text-sm">Erro ao sincronizar loja</p>
          <p className="text-xs mt-0.5">{errorMessage}</p>
        </div>
      </div>
    );
  }

  if (!activeStore) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl">
        <div className="w-12 h-12 bg-[#0094eb]/10 text-[#0094eb] rounded-xl flex items-center justify-center mx-auto mb-3">
          <StoreIcon className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Nenhuma loja cadastrada
        </h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
          Não identificamos nenhuma loja vinculada ao seu usuário (`owner_user_id`). Cadastre uma loja no Core do SLL para utilizar o Vidlytics.
        </p>
      </div>
    );
  }

  const ctr = metrics.totalViews > 0 
    ? ((metrics.totalCtaClicks / metrics.totalViews) * 100).toFixed(1) 
    : '0.0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span>{activeStore.name}</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
              ID: {activeStore.id}
            </span>
          </h2>
          <p className="text-xs text-slate-500">Métricas consolidadas de vídeo commerce e engajamento.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Visualizações</span>
            <div className="p-2 rounded-lg bg-[#0094eb]/10 text-[#0094eb]">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {metrics.totalViews.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Total de reproduções
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Cliques no CTA</span>
            <div className="p-2 rounded-lg bg-[#fd8539]/10 text-[#fd8539]">
              <MousePointerClick className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {metrics.totalCtaClicks.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            CTR: <strong className="text-slate-700 dark:text-slate-300">{ctr}%</strong>
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Produtos Clicados</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {metrics.totalProductClicks.toLocaleString('pt-BR')}
          </div>
          <p className="text-xs text-slate-400 mt-1">Direcionamentos ao carrinho</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Receita Atribuída</span>
            <div className="p-2 rounded-lg bg-[#0094eb]/10 text-[#0094eb]">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.estimatedRevenue)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Estimada via interações</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Vídeos Recentes
          </h3>
          <span className="text-xs text-slate-400">{videos.length} listados</span>
        </div>

        {videos.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            Nenhum vídeo publicado nesta loja ainda.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {videos.map((vid) => (
              <div key={vid.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-14 bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200 dark:border-slate-700">
                    {vid.thumbnail_url ? (
                      <img src={vid.thumbnail_url} alt={vid.title} className="w-full h-full object-cover" />
                    ) : (
                      <Play className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">{vid.title}</h4>
                    <span className="text-xs text-slate-400">ID: {vid.id.substring(0, 8)}...</span>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  Publicado
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VidlyticsOverviewTab;
