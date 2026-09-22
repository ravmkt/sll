import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useStore } from '../../contexts/StoreContext';
import { VidlyticsDatabaseService } from '../../services/VidlyticsDatabaseService';
import {
  Video as VideoIcon,
  PlaySquare,
  BarChart3,
  Sliders,
  Plus,
  ExternalLink,
  Eye,
  Heart,
  Loader2
} from 'lucide-react';

interface VideoItem {
  id: string;
  title?: string;
  video_url?: string;
  thumbnail_url?: string;
  views_count?: number;
  likes_count?: number;
  is_active?: boolean;
  created_at?: string;
}

export default function Vidlytics() {
  const { currentStore } = useStore();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'videos' | 'stories' | 'widget'>('videos');

  const loadData = useCallback(async () => {
    if (!currentStore?.id) return;
    try {
      setLoading(true);
      const data = await VidlyticsDatabaseService.getVideos(currentStore.id);
      setVideos((data as VideoItem[]) || []);
    } catch (err) {
      console.error('Erro ao carregar dados do Vidlytics:', err);
    } finally {
      setLoading(false);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-lg bg-[#0094eb]/10 text-[#0094eb]">
                <VideoIcon size={24} />
              </span>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Vidlytics</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Widgets de vídeos curtos estilo Reels para impulsionar conversões
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={!currentStore?.id}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#fd8539] hover:bg-orange-600 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              <Plus size={16} />
              Novo Vídeo
            </button>
          </div>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
          <button
            onClick={() => setActiveTab('videos')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'videos'
                ? 'border-[#0094eb] text-[#0094eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <PlaySquare size={16} />
            Vídeos ({videos.length})
          </button>
          <button
            onClick={() => setActiveTab('stories')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'stories'
                ? 'border-[#0094eb] text-[#0094eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <BarChart3 size={16} />
            Stories
          </button>
          <button
            onClick={() => setActiveTab('widget')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors ${
              activeTab === 'widget'
                ? 'border-[#0094eb] text-[#0094eb]'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sliders size={16} />
            Configuração do Widget
          </button>
        </div>

        {/* Conteúdo da Aba: Vídeos */}
        {activeTab === 'videos' && (
          <div>
            {!currentStore?.id ? (
              <div className="p-12 text-center bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-slate-500 dark:text-slate-400">
                  Selecione uma loja no topo para visualizar os vídeos.
                </p>
              </div>
            ) : loading ? (
              <div className="p-12 flex flex-col items-center justify-center bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl">
                <Loader2 size={32} className="animate-spin text-[#0094eb] mb-2" />
                <p className="text-sm text-slate-500">Carregando vídeos do Vidlytics...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#0094eb]/10 text-[#0094eb] flex items-center justify-center">
                  <PlaySquare size={24} />
                </div>
                <h3 className="font-semibold text-lg">Nenhum vídeo cadastrado</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Você ainda não possui vídeos cadastrados no Vidlytics para esta loja. Adicione seu primeiro vídeo para exibi-lo no site.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map((vid) => (
                  <div
                    key={vid.id}
                    className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-[#0094eb] transition-all flex flex-col"
                  >
                    <div className="relative aspect-[9/16] bg-slate-900 flex items-center justify-center">
                      {vid.thumbnail_url ? (
                        <img
                          src={vid.thumbnail_url}
                          alt={vid.title || 'Vídeo Vidlytics'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PlaySquare size={36} className="text-slate-500" />
                      )}
                      <span
                        className={`absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-semibold ${
                          vid.is_active !== false
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {vid.is_active !== false ? 'Ativo' : 'Pausado'}
                      </span>
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <h4 className="font-medium text-sm truncate" title={vid.title || 'Sem título'}>
                        {vid.title || 'Sem título'}
                      </h4>

                      <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="inline-flex items-center gap-1">
                          <Eye size={12} /> {vid.views_count || 0}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart size={12} /> {vid.likes_count || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Aba Stories */}
        {activeTab === 'stories' && (
          <div className="p-8 text-center bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl">
            <h3 className="font-semibold text-lg mb-1">Módulo Stories</h3>
            <p className="text-sm text-slate-500">
              Gerencie grupos de stories em destaque no topo da sua loja virtual.
            </p>
          </div>
        )}

        {/* Aba Configurações do Widget */}
        {activeTab === 'widget' && (
          <div className="p-8 bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl space-y-4">
            <h3 className="font-semibold text-lg">Integração do Widget Vidlytics</h3>
            <p className="text-sm text-slate-500">
              O widget é injetado automaticamente através do script SLL Loader instalado no seu Google Tag Manager.
            </p>
            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-lg text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>https://cdn.lojalucrativa.com/scripts/sll-loader.js</span>
              <ExternalLink size={14} />
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
