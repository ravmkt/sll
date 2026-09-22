import { useEffect, useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { useStore } from '../../contexts/StoreContext';
import { VidlyticsDatabaseService, StoryItem } from '../../services/VidlyticsDatabaseService';
import {
  Video as VideoIcon,
  PlaySquare,
  BarChart3,
  Sliders,
  Plus,
  ExternalLink,
  Eye,
  Heart,
  Loader2,
  Trash2,
  X,
  Layers,
  Save,
  CheckCircle2
} from 'lucide-react';

interface VideoItem {
  id: string;
  store_id: string;
  title?: string;
  video_url?: string;
  thumbnail_url?: string;
  views_count?: number;
  likes_count?: number;
  active?: boolean;
  is_active?: boolean;
  status?: string;
  created_at?: string;
}

export default function Vidlytics() {
  const { currentStore } = useStore();
  const [activeTab, setActiveTab] = useState<'videos' | 'stories' | 'widget'>('videos');

  // Estados de Vídeos
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [savingVideo, setSavingVideo] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  // Estados de Stories
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [savingStory, setSavingStory] = useState(false);
  const [storyTitle, setStoryTitle] = useState('');

  // Estados de Aparência / Configuração do Widget
  const [primaryColor, setPrimaryColor] = useState('#0094eb');
  const [buttonPosition, setButtonPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [savingWidget, setSavingWidget] = useState(false);
  const [widgetSavedSuccess, setWidgetSavedSuccess] = useState(false);

  // --- CARREGAMENTO DE DADOS ---
  const loadVideos = useCallback(async () => {
    if (!currentStore?.id) return;
    try {
      setLoadingVideos(true);
      const data = await VidlyticsDatabaseService.getVideos(currentStore.id);
      setVideos((data as VideoItem[]) || []);
    } catch (err) {
      console.error('Erro ao carregar vídeos do Vidlytics:', err);
    } finally {
      setLoadingVideos(false);
    }
  }, [currentStore?.id]);

  const loadStories = useCallback(async () => {
    if (!currentStore?.id) return;
    try {
      setLoadingStories(true);
      const data = await VidlyticsDatabaseService.getStories(currentStore.id);
      setStories((data as StoryItem[]) || []);
    } catch (err) {
      console.error('Erro ao carregar stories:', err);
      toast.error('Erro ao carregar os stories.');
    } finally {
      setLoadingStories(false);
    }
  }, [currentStore?.id]);

  const loadAppearance = useCallback(async () => {
    if (!currentStore?.id) return;
    try {
      const data = await VidlyticsDatabaseService.getAppearances(currentStore.id);
      if (data) {
        if (data.primary_color) setPrimaryColor(data.primary_color);
        if (data.position) setButtonPosition(data.position);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações de aparência:', err);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    if (activeTab === 'videos') loadVideos();
    if (activeTab === 'stories') loadStories();
    if (activeTab === 'widget') loadAppearance();
  }, [activeTab, loadVideos, loadStories, loadAppearance]);

  // --- AÇÕES DE VÍDEOS ---
  const handleCreateVideo = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id || !videoTitle.trim() || !videoUrl.trim()) return;

    try {
      setSavingVideo(true);
      await VidlyticsDatabaseService.createVideo({
        store_id: currentStore.id,
        title: videoTitle.trim(),
        video_url: videoUrl.trim(),
        thumbnail_url: thumbnailUrl.trim() || undefined,
        active: true
      });

      setVideoTitle('');
      setVideoUrl('');
      setThumbnailUrl('');
      setIsVideoModalOpen(false);
      await loadVideos();
    } catch (err) {
      console.error('Erro ao cadastrar vídeo:', err);
      alert('Ocorreu um erro ao cadastrar o vídeo.');
    } finally {
      setSavingVideo(false);
    }
  };

  const handleToggleVideoStatus = async (videoId: string, currentStatus: boolean) => {
    try {
      await VidlyticsDatabaseService.updateVideo(videoId, { active: !currentStatus });
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, active: !currentStatus } : v))
      );
    } catch (err) {
      console.error('Erro ao alternar status do vídeo:', err);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este vídeo?')) return;
    try {
      await VidlyticsDatabaseService.deleteVideo(videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
    } catch (err) {
      console.error('Erro ao excluir vídeo:', err);
      alert('Erro ao excluir vídeo.');
    }
  };

  // --- AÇÕES DE STORIES ---
  const handleCreateStory = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id || !storyTitle.trim()) return;

    try {
      setSavingStory(true);
      await VidlyticsDatabaseService.createStory({
        store_id: currentStore.id,
        title: storyTitle.trim(),
        active: true,
        position: stories.length
      });

      setStoryTitle('');
      setIsStoryModalOpen(false);
      toast.success('Story cadastrado com sucesso!');
      await loadStories();
    } catch (err) {
      console.error('Erro ao cadastrar story:', err);
      toast.error('Ocorreu um erro ao criar o story.');
    } finally {
      setSavingStory(false);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este grupo de stories?')) return;
    try {
      await VidlyticsDatabaseService.deleteStory(storyId);
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      toast.success('Story excluÃ­do com sucesso.');
    } catch (err) {
      console.error('Erro ao excluir story:', err);
      toast.error('Erro ao excluir story.');
    }
  };

  // --- AÇÕES DO WIDGET ---
  const handleSaveWidgetAppearance = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id) return;

    try {
      setSavingWidget(true);
      await VidlyticsDatabaseService.upsertAppearances(currentStore.id, {
        primary_color: primaryColor,
        position: buttonPosition
      });
      setWidgetSavedSuccess(true);
      setTimeout(() => setWidgetSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar customização do widget:', err);
      alert('Erro ao salvar personalização.');
    } finally {
      setSavingWidget(false);
    }
  };

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
            {activeTab === 'videos' && (
              <button
                onClick={() => setIsVideoModalOpen(true)}
                disabled={!currentStore?.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#fd8539] hover:bg-orange-600 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <Plus size={16} />
                Novo Vídeo
              </button>
            )}
            {activeTab === 'stories' && (
              <button
                onClick={() => setIsStoryModalOpen(true)}
                disabled={!currentStore?.id}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#fd8539] hover:bg-orange-600 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
              >
                <Plus size={16} />
                Novo Story
              </button>
            )}
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
            <Layers size={16} />
            Stories ({stories.length})
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

        {/* ============================================================== */}
        {/* ABA: VÍDEOS */}
        {/* ============================================================== */}
        {activeTab === 'videos' && (
          <div>
            {!currentStore?.id ? (
              <div className="p-12 text-center bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-slate-500 dark:text-slate-400">
                  Selecione uma loja no topo para visualizar os vídeos.
                </p>
              </div>
            ) : loadingVideos ? (
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
                <button
                  onClick={() => setIsVideoModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0094eb] hover:bg-blue-600 text-white font-medium text-sm transition-colors mt-2"
                >
                  <Plus size={16} /> Cadastrar Vídeo Agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {videos.map((vid) => {
                  const isItemActive = vid.active !== undefined ? vid.active : vid.is_active !== false;

                  return (
                    <div
                      key={vid.id}
                      className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-[#0094eb] transition-all flex flex-col relative group"
                    >
                      <div className="relative aspect-[9/16] bg-slate-900 flex items-center justify-center overflow-hidden">
                        {vid.thumbnail_url ? (
                          <img
                            src={vid.thumbnail_url}
                            alt={vid.title || 'Vídeo Vidlytics'}
                            className="w-full h-full object-cover"
                          />
                        ) : vid.video_url ? (
                          <video
                            src={vid.video_url}
                            className="w-full h-full object-cover opacity-80"
                            preload="metadata"
                            muted
                          />
                        ) : (
                          <PlaySquare size={36} className="text-slate-500" />
                        )}

                        <button
                          onClick={() => handleToggleVideoStatus(vid.id, isItemActive)}
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-opacity ${
                            isItemActive
                              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                              : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                          }`}
                          title="Clique para alternar o status"
                        >
                          {isItemActive ? 'Ativo' : 'Pausado'}
                        </button>

                        <button
                          onClick={() => handleDeleteVideo(vid.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 hover:bg-red-600 text-white transition-colors opacity-0 group-hover:opacity-100"
                          title="Excluir vídeo"
                        >
                          <Trash2 size={14} />
                        </button>
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
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: STORIES */}
        {/* ============================================================== */}
        {activeTab === 'stories' && (
          <div>
            {!currentStore?.id ? (
              <div className="p-12 text-center bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl">
                <p className="text-slate-500 dark:text-slate-400">
                  Selecione uma loja no topo para visualizar os stories.
                </p>
              </div>
            ) : loadingStories ? (
              <div className="p-12 flex flex-col items-center justify-center bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl">
                <Loader2 size={32} className="animate-spin text-[#0094eb] mb-2" />
                <p className="text-sm text-slate-500">Carregando stories do Vidlytics...</p>
              </div>
            ) : stories.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#0094eb]/10 text-[#0094eb] flex items-center justify-center">
                  <Layers size={24} />
                </div>
                <h3 className="font-semibold text-lg">Nenhum grupo de stories cadastrado</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Crie coleções de vídeos estilo Stories de redes sociais para fixar na vitrine da sua loja.
                </p>
                <button
                  onClick={() => setIsStoryModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0094eb] hover:bg-blue-600 text-white font-medium text-sm transition-colors mt-2"
                >
                  <Plus size={16} /> Criar Story Agora
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {stories.map((story) => (
                  <div
                    key={story.id}
                    className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-[#0094eb] transition-all flex flex-col justify-between"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border-2 border-[#0094eb] p-0.5 flex items-center justify-center bg-slate-100 dark:bg-slate-800">
                          <Layers size={18} className="text-[#0094eb]" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm leading-tight">{story.title}</h4>
                          <span className={`inline-block mt-1 text-[11px] px-1.5 py-0.5 rounded font-medium ${
                            story.active !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {story.active !== false ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteStory(story.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1"
                        title="Excluir story"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <span>Posição: #{story.position || 0}</span>
                      <span>{story.view_count || 0} visualizações</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* ABA: CONFIGURAÇÃO DO WIDGET */}
        {/* ============================================================== */}
        {activeTab === 'widget' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <form onSubmit={handleSaveWidgetAppearance} className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Sliders size={20} className="text-[#0094eb]" />
                  Aparência do Widget Vidlytics
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Cor Primária do Widget
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-10 h-10 rounded border border-slate-300 cursor-pointer p-0.5 bg-transparent"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Posição Flutuante na Tela
                    </label>
                    <select
                      value={buttonPosition}
                      onChange={(e) => setButtonPosition(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                    >
                      <option value="bottom-right">Canto Inferior Direito</option>
                      <option value="bottom-left">Canto Inferior Esquerdo</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <button
                    type="submit"
                    disabled={savingWidget || !currentStore?.id}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#0094eb] hover:bg-blue-600 text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50"
                  >
                    {savingWidget ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    Salvar Alterações
                  </button>

                  {widgetSavedSuccess && (
                    <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 size={16} /> Salvo com sucesso!
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* Injeção GTM Loader */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-4">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <ExternalLink size={18} className="text-[#fd8539]" />
                  Instalação GTM
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  O Vidlytics é acionado automaticamente em sua loja via <strong>SLL Loader</strong>. Basta que a Tag do SLL esteja ativa no seu Google Tag Manager.
                </p>
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 break-all">
                  https://cdn.lojalucrativa.com/scripts/sll-loader.js
                </div>
                <div className="text-[11px] text-slate-400">
                  Status: <strong>Módulo Conectado via Schema vidlytics</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Novo Vídeo */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-base">Novo Vídeo Vidlytics</h3>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVideo} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Vídeo *
                </label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Ex: Vestido Floral Verão"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL do Vídeo (MP4 / HLS) *
                </label>
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://cdn.exemplo.com/video.mp4"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL da Capa (Thumbnail opcional)
                </label>
                <input
                  type="url"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="https://cdn.exemplo.com/thumb.jpg"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingVideo}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0094eb] hover:bg-blue-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {savingVideo ? <Loader2 size={16} className="animate-spin" /> : null}
                  Cadastrar Vídeo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Story */}
      {isStoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-semibold text-base">Novo Grupo de Stories</h3>
              <button
                onClick={() => setIsStoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Story *
                </label>
                <input
                  type="text"
                  required
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  placeholder="Ex: Lançamentos de Outono"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStoryModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingStory}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0094eb] hover:bg-blue-600 text-white font-medium text-sm transition-colors disabled:opacity-50"
                >
                  {savingStory ? <Loader2 size={16} className="animate-spin" /> : null}
                  Criar Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
