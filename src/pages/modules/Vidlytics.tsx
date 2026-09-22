"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LayoutDashboard,
  Film,
  Play,
  Eye,
  MousePointerClick,
  TrendingUp,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Code2,
  Palette,
  Layers,
  Sparkles,
  ExternalLink,
  Trash2,
  Edit2,
  RefreshCw,
  ShoppingBag,
  Sliders,
  Smartphone,
  Monitor,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { LayoutDashboard, SLLDatabaseService } from '@/services/SLLDatabaseService';
import { LayoutDashboard, VidlyticsDatabaseService } from '@/services/VidlyticsDatabaseService';
import { LayoutDashboard, Video, Story, Appearance } from '@/types/vidlytics';
import VideoThumbnail from '@/components/vidlytics/VideoThumbnail';
import WidgetPreview from '@/components/vidlytics/WidgetPreview';
import VidlyticsOverviewTab from '@/components/vidlytics/VidlyticsOverviewTab';
import { LayoutDashboard, toast } from 'sonner';

export default function VidlyticsPage() {
  const [activeTab, setActiveTab] = useState<'catalog' | 'stories' | 'appearance' | 'integration'>('catalog');
  const [storeId, setStoreId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Estados do Catálogo de Vídeos
  const [videos, setVideos] = useState<Video[]>([]);
  const [videoSearch, setVideoSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isNewVideoOpen, setIsNewVideoOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

  // Formulário Novo Vídeo
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoThumb, setNewVideoThumb] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);

  // Estados dos Stories
  const [stories, setStories] = useState<Story[]>([]);
  const [isNewStoryOpen, setIsNewStoryOpen] = useState(false);
  const [newStoryTitle, setNewStoryTitle] = useState('');

  // Estados de Aparência
  const [appearance, setAppearance] = useState<Appearance>({
    id: '',
    primary_color: '#0094eb',
    accent_color: '#fd8539',
    border_radius: '12',
    position_type: 'floating',
    widget_layout: 'stories',
    auto_play: true,
    show_views: true,
  });
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Estados de Integração
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedConversion, setCopiedConversion] = useState(false);

  // 1. Carrega dados da loja ativa
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const store = await SLLDatabaseService.getCurrentStore();
      if (!store) {
        toast.error('Nenhuma loja encontrada.');
        return;
      }
      setStoreId(store.id);

      // Busca vídeos, stories e aparências no schema vidlytics
      const [videosData, storiesData, appearanceData] = await Promise.all([
        VidlyticsDatabaseService.getVideos(store.id).catch(() => []),
        VidlyticsDatabaseService.getStories(store.id).catch(() => []),
        VidlyticsDatabaseService.getAppearance(store.id).catch(() => null)
      ]);

      setVideos(videosData || []);
      setStories(storiesData || []);
      if (appearanceData) {
        setAppearance(prev => ({ ...prev, ...appearanceData }));
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do Vidlytics:', err);
      toast.error('Erro ao sincronizar dados com o servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtros de Catálogo
  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchSearch = (v.title || '').toLowerCase().includes(videoSearch.toLowerCase());
      const matchStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? v.active !== false :
        v.active === false;
      return matchSearch && matchStatus;
    });
  }, [videos, videoSearch, statusFilter]);

  // Métricas agregadas
  const metrics = useMemo(() => {
    const totalVideos = videos.length;
    const totalPlays = videos.reduce((acc, v) => acc + (v.plays_count || 0), 0);
    const totalClicks = videos.reduce((acc, v) => acc + (v.clicks_count || 0), 0);
    const totalConversions = videos.reduce((acc, v) => acc + (v.conversion_count || 0), 0);
    const avgConversionRate = totalClicks > 0 ? ((totalConversions / totalClicks) * 100).toFixed(1) : '0.0';

    return { totalVideos, totalPlays, totalClicks, totalConversions, avgConversionRate };
  }, [videos]);

  // Ações de Vídeos
  const handleCreateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoUrl.trim()) {
      toast.error('Por favor, informe a URL do vídeo.');
      return;
    }
    try {
      setSavingVideo(true);
      const created = await VidlyticsDatabaseService.createVideo({
        store_id: storeId,
        title: newVideoTitle.trim() || 'Vídeo sem título',
        video_url: newVideoUrl.trim(),
        thumbnail_url: newVideoThumb.trim() || undefined,
        active: true
      });
      setVideos(prev => [created, ...prev]);
      setIsNewVideoOpen(false);
      setNewVideoTitle('');
      setNewVideoUrl('');
      setNewVideoThumb('');
      toast.success('Vídeo cadastrado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao cadastrar vídeo: ' + err.message);
    } finally {
      setSavingVideo(false);
    }
  };

  const handleToggleActive = async (video: Video) => {
    const newStatus = !video.active;
    try {
      await VidlyticsDatabaseService.updateVideo(video.id, { active: newStatus });
      setVideos(prev => prev.map(v => v.id === video.id ? { ...v, active: newStatus } : v));
      toast.success(`Vídeo ${newStatus ? 'ativado' : 'pausado'}!`);
    } catch (err: any) {
      toast.error('Erro ao alterar status: ' + err.message);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Deseja realmente remover este vídeo?')) return;
    try {
      await VidlyticsDatabaseService.deleteVideo(videoId);
      setVideos(prev => prev.filter(v => v.id !== videoId));
      toast.success('Vídeo excluído.');
    } catch (err: any) {
      toast.error('Erro ao excluir vídeo: ' + err.message);
    }
  };

  // Ações de Stories
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoryTitle.trim()) {
      toast.error('Dê um título ao grupo de Stories.');
      return;
    }
    try {
      const created = await VidlyticsDatabaseService.createStory({
        store_id: storeId,
        title: newStoryTitle.trim(),
        active: true
      });
      setStories(prev => [created, ...prev]);
      setIsNewStoryOpen(false);
      setNewStoryTitle('');
      toast.success('Story criado com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao criar story: ' + err.message);
    }
  };

  // Ações de Aparência
  const handleSaveAppearance = async () => {
    try {
      setSavingAppearance(true);
      await VidlyticsDatabaseService.saveAppearance(storeId, appearance);
      toast.success('Configurações visuais salvas com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao salvar aparência: ' + err.message);
    } finally {
      setSavingAppearance(false);
    }
  };

  // Scripts de Instalação (SLL Core Script Único + Pixel Conversão)
  const coreScriptTag = `<script async src="https://cdn.sistemalojalucrativa.com.br/sll-loader.js?storeId=${storeId || 'SUA_STORE_ID'}"></script>`;

  const conversionScriptTag = `<script>
  window.sllOrderTracking = {
    storeId: "${storeId || 'SUA_STORE_ID'}",
    orderId: "{{order_id}}",
    orderTotal: {{order_total}},
    currency: "BRL"
  };
</script>
<script async src="https://cdn.sistemalojalucrativa.com.br/sll-conversion.js"></script>`;

  const copyToClipboard = (text: string, type: 'core' | 'conv') => {
    navigator.clipboard.writeText(text);
    if (type === 'core') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedConversion(true);
      setTimeout(() => setCopiedConversion(false), 2000);
    }
    toast.success('Código copiado para a área de transferência!');
  };

  return (
    <div className="space-y-6">
      {/* Header com Identidade Visual SLL */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0094eb] to-[#00c6ff] flex items-center justify-center text-white shadow-md shadow-[#0094eb]/20">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              Vidlytics
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#0094eb]/10 text-[#0094eb] border border-[#0094eb]/20">
                Shoppable Video & Stories
              </span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Aumente suas conversões de e-commerce transformando vídeos em vitrines interativas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navegação por Abas Nativas SLL */}
      <div className="flex items-center gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-[2px] ${
            activeTab === 'catalog'
              ? 'border-[#0094eb] text-[#0094eb] font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Film className="w-4 h-4" />
          Catálogo de Vídeos
          <span className="ml-1 text-xs px-2 py-0.2 rounded-full bg-muted text-muted-foreground">
            {videos.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-[2px] ${
            activeTab === 'stories'
              ? 'border-[#0094eb] text-[#0094eb] font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Layers className="w-4 h-4" />
          Stories
          <span className="ml-1 text-xs px-2 py-0.2 rounded-full bg-muted text-muted-foreground">
            {stories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-[2px] ${
            activeTab === 'appearance'
              ? 'border-[#0094eb] text-[#0094eb] font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Palette className="w-4 h-4" />
          Aparência do Widget
        </button>

        <button
          onClick={() => setActiveTab('integration')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all -mb-[2px] ${
            activeTab === 'integration'
              ? 'border-[#0094eb] text-[#0094eb] font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Code2 className="w-4 h-4" />
          Integração (GTM)
        </button>
      </div>

      {/* ============================================================ */}
      {/* ABA 1: CATÁLOGO DE VÍDEOS                                   */}
      {/* ============================================================ */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Cards de Métricas Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Vídeos Ativos</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{metrics.totalVideos}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#0094eb]/10 text-[#0094eb] flex items-center justify-center">
                <Film className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Reproduções (Plays)</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{metrics.totalPlays.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/10 text-green-600 flex items-center justify-center">
                <Play className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Cliques em Produtos</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{metrics.totalClicks.toLocaleString('pt-BR')}</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-[#fd8539]/10 text-[#fd8539] flex items-center justify-center">
                <MousePointerClick className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Taxa Média Conversão</p>
                <h3 className="text-2xl font-bold mt-1 text-foreground">{metrics.avgConversionRate}%</h3>
              </div>
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Barra de Filtros e Ação Principal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar vídeos pelo título..."
                  value={videoSearch}
                  onChange={(e) => setVideoSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e: any) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
              >
                <option value="all">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Pausados</option>
              </select>
            </div>

            <button
              onClick={() => setIsNewVideoOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0094eb] hover:bg-[#0080cb] text-white text-sm font-semibold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              Adicionar Vídeo
            </button>
          </div>

          {/* Listagem / Tabela de Vídeos */}
          {filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card border border-dashed border-border rounded-xl text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                <Film className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Nenhum vídeo encontrado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Adicione seu primeiro vídeo para exibi-lo como widget interativo na sua loja virtual.
              </p>
              <button
                onClick={() => setIsNewVideoOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0094eb] text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Adicionar Vídeo Agora
              </button>
            </div>
          ) : (
            <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground uppercase border-b border-border">
                    <tr>
                      <th className="px-4 py-3">Vídeo</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-center">Plays</th>
                      <th className="px-4 py-3 text-center">Cliques</th>
                      <th className="px-4 py-3 text-center">Conversões</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredVideos.map((video) => (
                      <tr key={video.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div
                              onClick={() => setPreviewVideo(video)}
                              className="relative w-12 h-16 rounded-md overflow-hidden bg-black/10 flex-shrink-0 cursor-pointer group"
                            >
                              <VideoThumbnail video={video} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Play className="w-5 h-5 text-white" />
                              </div>
                            </div>
                            <div className="max-w-xs truncate">
                              <p className="font-medium text-foreground truncate" title={video.title}>
                                {video.title || 'Vídeo sem título'}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {video.source_type ? video.source_type.toUpperCase() : 'URL DIRETA'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleToggleActive(video)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                              video.active !== false
                                ? 'bg-green-500/10 text-green-600 hover:bg-green-500/20'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${video.active !== false ? 'bg-green-500' : 'bg-muted-foreground'}`} />
                            {video.active !== false ? 'Ativo' : 'Pausado'}
                          </button>
                        </td>

                        <td className="px-4 py-3 text-center font-medium">
                          {(video.plays_count || 0).toLocaleString('pt-BR')}
                        </td>

                        <td className="px-4 py-3 text-center font-medium">
                          {(video.clicks_count || 0).toLocaleString('pt-BR')}
                        </td>

                        <td className="px-4 py-3 text-center">
                          <span className="font-semibold text-purple-600">
                            {video.conversion_count || 0}
                          </span>
                        </td>

                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewVideo(video)}
                              className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              title="Visualizar Vídeo"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteVideo(video.id)}
                              className="p-1.5 rounded hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                              title="Excluir Vídeo"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 2: STORIES                                              */}
      {/* ============================================================ */}
      {activeTab === 'stories' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div>
              <h3 className="font-bold text-base text-foreground">Grupos de Stories</h3>
              <p className="text-sm text-muted-foreground">
                Crie bolhas de stories estilo Instagram no cabeçalho ou nas páginas de produto.
              </p>
            </div>
            <button
              onClick={() => setIsNewStoryOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0094eb] hover:bg-[#0080cb] text-white text-sm font-semibold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Criar Novo Story
            </button>
          </div>

          {stories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-card border border-dashed border-border rounded-xl text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
                <Layers className="w-7 h-7" />
              </div>
              <h3 className="text-base font-semibold text-foreground">Nenhum Story criado</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Agrupe seus vídeos em círculos de Stories para engajar clientes diretamente na página inicial.
              </p>
              <button
                onClick={() => setIsNewStoryOpen(true)}
                className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0094eb] text-white text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                Criar Story Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stories.map(story => (
                <div key={story.id} className="p-4 rounded-xl border border-border bg-card shadow-sm hover:border-[#0094eb]/50 transition-all flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full border-2 border-[#fd8539] p-0.5 flex-shrink-0">
                      <div className="w-full h-full rounded-full bg-muted flex items-center justify-center overflow-hidden">
                        {story.thumbnail_url ? (
                          <img src={story.thumbnail_url} alt={story.title} className="w-full h-full object-cover" />
                        ) : (
                          <Layers className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-semibold text-foreground truncate">{story.title}</h4>
                      <p className="text-xs text-muted-foreground">
                        {story.story_videos?.length || 0} vídeo(s)
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {story.view_count || 0} views
                    </span>
                    <span className={`px-2 py-0.5 rounded-full ${story.active ? 'bg-green-500/10 text-green-600' : 'bg-muted'}`}>
                      {story.active ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 3: APARÊNCIA DO WIDGET                                  */}
      {/* ============================================================ */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Coluna de Configuração */}
          <div className="lg:col-span-5 space-y-5 bg-card p-5 rounded-xl border border-border shadow-sm">
            <div>
              <h3 className="font-bold text-base text-foreground">Personalização do Widget</h3>
              <p className="text-xs text-muted-foreground">
                Defina como os vídeos flutuam ou se integram ao layout do seu e-commerce.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Cor Primária (#0094eb Padrão SLL)
                </label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="color"
                    value={appearance.primary_color || '#0094eb'}
                    onChange={(e) => setAppearance({ ...appearance, primary_color: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border p-1 bg-background"
                  />
                  <input
                    type="text"
                    value={appearance.primary_color || '#0094eb'}
                    onChange={(e) => setAppearance({ ...appearance, primary_color: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Cor de Destaque / CTA (#fd8539 Padrão SLL)
                </label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="color"
                    value={appearance.accent_color || '#fd8539'}
                    onChange={(e) => setAppearance({ ...appearance, accent_color: e.target.value })}
                    className="w-10 h-10 rounded-lg cursor-pointer border border-border p-1 bg-background"
                  />
                  <input
                    type="text"
                    value={appearance.accent_color || '#fd8539'}
                    onChange={(e) => setAppearance({ ...appearance, accent_color: e.target.value })}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-background uppercase font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Posicionamento no Site
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setAppearance({ ...appearance, position_type: 'floating' })}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      appearance.position_type === 'floating'
                        ? 'border-[#0094eb] bg-[#0094eb]/10 text-[#0094eb]'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    Flutuante (Canto Inferior)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAppearance({ ...appearance, position_type: 'inline' })}
                    className={`py-2 px-3 text-xs font-semibold rounded-lg border text-center transition-all ${
                      appearance.position_type === 'inline'
                        ? 'border-[#0094eb] bg-[#0094eb]/10 text-[#0094eb]'
                        : 'border-border bg-background text-muted-foreground'
                    }`}
                  >
                    Embutido (Inline na Página)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Arredondamento das Bordas (px)
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={Number(appearance.border_radius) || 12}
                  onChange={(e) => setAppearance({ ...appearance, border_radius: Number(e.target.value) })}
                  className="w-full mt-2 accent-[#0094eb]"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Quadrado (0px)</span>
                  <span className="font-mono font-bold text-foreground">{appearance.border_radius || 12}px</span>
                  <span>Muito Arredondado (30px)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-border space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-foreground">Reprodução Automática</span>
                  <input
                    type="checkbox"
                    checked={appearance.auto_play !== false}
                    onChange={(e) => setAppearance({ ...appearance, auto_play: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0094eb] focus:ring-[#0094eb]"
                  />
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm font-medium text-foreground">Exibir Contador de Visualizações</span>
                  <input
                    type="checkbox"
                    checked={appearance.show_views !== false}
                    onChange={(e) => setAppearance({ ...appearance, show_views: e.target.checked })}
                    className="w-4 h-4 rounded text-[#0094eb] focus:ring-[#0094eb]"
                  />
                </label>
              </div>
            </div>

            <button
              onClick={handleSaveAppearance}
              disabled={savingAppearance}
              className="w-full py-2.5 rounded-lg bg-[#0094eb] hover:bg-[#0080cb] text-white font-semibold text-sm transition-all shadow-sm"
            >
              {savingAppearance ? 'Salvando Alterações...' : 'Salvar Aparência'}
            </button>
          </div>

          {/* Coluna de Preview Interativo */}
          <div className="lg:col-span-7 bg-muted/40 p-6 rounded-xl border border-border flex flex-col items-center justify-center min-h-[460px]">
            <div className="flex items-center gap-2 mb-4 bg-card border border-border p-1 rounded-lg">
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`p-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  previewDevice === 'mobile' ? 'bg-[#0094eb] text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile
              </button>
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`p-1.5 rounded flex items-center gap-1.5 text-xs font-medium transition-colors ${
                  previewDevice === 'desktop' ? 'bg-[#0094eb] text-white' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop
              </button>
            </div>

            <div className={`transition-all duration-300 w-full ${previewDevice === 'mobile' ? 'max-w-[340px]' : 'max-w-xl'}`}>
              <div className="border-4 border-slate-800 rounded-3xl p-3 bg-card shadow-2xl relative overflow-hidden">
                <div className="text-center pb-2 border-b border-border/40 text-[11px] font-mono text-muted-foreground">
                  Preview ao Vivo da Loja
                </div>

                <div className="py-6 flex flex-col items-center justify-center">
                  <WidgetPreview
                    stories={stories}
                    generalSettings={null}
                    appearances={[appearance]}
                    videos={videos}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ABA 4: INTEGRAÇÃO (GTM & SCRIPT ÚNICO SLL)                  */}
      {/* ============================================================ */}
      {activeTab === 'integration' && (
        <div className="space-y-6 max-w-4xl">
          {/* Banner de Explicação da Arquitetura do Script Único */}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#0094eb] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-semibold text-foreground">Arquitetura de Instalação Única do Sistema Loja Lucrativa</h4>
              <p className="text-muted-foreground mt-0.5">
                Você só precisa instalar este script <strong>uma única vez</strong> via Google Tag Manager (GTM). Ele gerencia dinamicamente o Vidlytics e o Live Commerce para sua loja (<span className="font-mono text-xs font-bold text-foreground">{storeId || 'carregando...'}</span>).
              </p>
            </div>
          </div>

          {/* Passo 1: Script Central SLL Loader */}
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#0094eb]">Passo 1</span>
                <h3 className="font-bold text-base text-foreground mt-0.5">SLL Core Loader (Script Único)</h3>
                <p className="text-xs text-muted-foreground">
                  Insira este código em todas as páginas da loja via tag HTML Personalizado no GTM (Acionador: All Pages).
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(coreScriptTag, 'core')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0094eb] hover:bg-[#0080cb] text-white text-xs font-semibold transition-all"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedScript ? 'Copiado!' : 'Copiar Tag'}
              </button>
            </div>

            <div className="relative">
              <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800">
                {coreScriptTag}
              </pre>
            </div>
          </div>

          {/* Passo 2: Tag de Conversão e Rastreamento */}
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#fd8539]">Passo 2</span>
                <h3 className="font-bold text-base text-foreground mt-0.5">Pixel de Conversão / Vendas (Checkout)</h3>
                <p className="text-xs text-muted-foreground">
                  Instale exclusivamente na página de "Obrigado" / Confirmação do pedido para calcular o ROI e vendas geradas.
                </p>
              </div>

              <button
                onClick={() => copyToClipboard(conversionScriptTag, 'conv')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#fd8539] hover:bg-[#e6752d] text-white text-xs font-semibold transition-all"
              >
                {copiedConversion ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedConversion ? 'Copiado!' : 'Copiar Tag'}
              </button>
            </div>

            <div className="relative">
              <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800">
                {conversionScriptTag}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: NOVO VÍDEO                                            */}
      {/* ============================================================ */}
      {isNewVideoOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-foreground">Adicionar Novo Vídeo</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Cole o link do seu vídeo (MP4 direto, YouTube ou Shorts) para integrá-lo ao catálogo.
            </p>

            <form onSubmit={handleCreateVideo} className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground">Título do Vídeo</label>
                <input
                  type="text"
                  placeholder="Ex: Vestido Floral Midi Verão"
                  value={newVideoTitle}
                  onChange={(e) => setNewVideoTitle(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">URL do Vídeo *</label>
                <input
                  type="url"
                  required
                  placeholder="https://... (MP4 ou YouTube)"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">URL da Imagem de Capa (Thumbnail opcional)</label>
                <input
                  type="url"
                  placeholder="https://... (JPG, PNG ou WebP)"
                  value={newVideoThumb}
                  onChange={(e) => setNewVideoThumb(e.target.value)}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg border border-border bg-background focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsNewVideoOpen(false)}
                  className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingVideo}
                  className="px-4 py-2 rounded-lg bg-[#0094eb] hover:bg-[#0080cb] text-white text-sm font-semibold transition-all"
                >
                  {savingVideo ? 'Salvando...' : 'Adicionar Vídeo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: PREVIEW DE VÍDEO (PLAYER)                             */}
      {/* ============================================================ */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-black border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col items-center">
            <div className="w-full p-3 bg-black/80 flex items-center justify-between text-white border-b border-white/10 z-10">
              <span className="font-semibold text-sm truncate max-w-[220px]">{previewVideo.title}</span>
              <button
                onClick={() => setPreviewVideo(null)}
                className="text-white/70 hover:text-white text-sm px-2 py-0.5 rounded bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="w-full aspect-[9/16] bg-black flex items-center justify-center">
              <video
                src={previewVideo.video_url}
                controls
                autoPlay
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}