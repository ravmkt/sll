import React, { useEffect, useState, useCallback, useMemo } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import { 
  PlaySquare, 
  Layers, 
  Sliders, 
  Code, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Copy, 
  Eye, 
  Heart, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useStore } from '../../contexts/StoreContext';
import { 
  VidlyticsDatabaseService, 
  type VideoItem, 
  type StoryItem, 
  type WidgetAppearance 
} from '../../services/VidlyticsDatabaseService';

// ==========================================
// COMPONENTES MEMOIZADOS (Evitam Re-renders)
// ==========================================

interface VideoCardItemProps {
  video: VideoItem;
  onToggleStatus: (videoId: string, currentStatus: boolean) => void;
  onDelete: (videoId: string) => void;
}

const VideoCardItem = React.memo(function VideoCardItem({
  video,
  onToggleStatus,
  onDelete,
}: VideoCardItemProps) {
  const isItemActive = video.active !== undefined ? video.active : video.is_active !== false;

  return (
    <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm hover:border-[#0094eb] transition-all flex flex-col relative group">
      <div className="relative aspect-[9/16] bg-slate-900 flex items-center justify-center overflow-hidden">
        {video.thumbnail_url ? (
          <img loading="lazy" decoding="async"
            src={video.thumbnail_url}
            alt={video.title || 'Vídeo Vidlytics'}
            className="w-full h-full object-cover"
          />
        ) : video.video_url ? (
          <video
            src={video.video_url}
            className="w-full h-full object-cover opacity-80"
            preload="metadata"
            muted
          />
        ) : (
          <PlaySquare size={36} className="text-slate-500" />
        )}

        <button
          onClick={() => onToggleStatus(video.id, isItemActive)}
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
          onClick={() => onDelete(video.id)}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 hover:bg-red-600 text-white transition-colors opacity-0 group-hover:opacity-100"
          title="Excluir vídeo"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="p-3 flex-1 flex flex-col justify-between">
        <h4 className="font-medium text-sm truncate" title={video.title || 'Sem título'}>
          {video.title || 'Sem título'}
        </h4>

        <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="inline-flex items-center gap-1">
            <Eye size={12} /> {video.views_count || 0}
          </span>
          <span className="inline-flex items-center gap-1">
            <Heart size={12} /> {video.likes_count || 0}
          </span>
        </div>
      </div>
    </div>
  );
});

interface StoryCardItemProps {
  story: StoryItem;
  onDelete: (storyId: string) => void;
}

const StoryCardItem = React.memo(function StoryCardItem({
  story,
  onDelete,
}: StoryCardItemProps) {
  return (
    <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm hover:border-[#0094eb] transition-all flex flex-col justify-between">
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
          onClick={() => onDelete(story.id)}
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
  );
});

// ==========================================
// COMPONENTE PRINCIPAL VIDLYTICS
// ==========================================

export function Vidlytics() {
  const { currentStore, loadingStores } = useStore();
  const [activeTab, setActiveTab] = useState<'videos' | 'stories' | 'appearance' | 'integration'>('videos');

  // Estados de dados
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [stories, setStories] = useState<StoryItem[]>([]);
  const [appearance, setAppearance] = useState<WidgetAppearance | null>(null);
  const [loading, setLoading] = useState(true);

  // Estados de formulário/modal
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [storyTitle, setStoryTitle] = useState('');

  // Configurações de Aparência
  const [primaryColor, setPrimaryColor] = useState('#0094eb');
  const [secondaryColor, setSecondaryColor] = useState('#fd8539');
  const [borderRadius, setBorderRadius] = useState(12);
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');

  // --- CARREGAMENTO DE DADOS ---
  const loadVideos = useCallback(async () => {
    if (!currentStore?.id) return;
    try {
      const data = await VidlyticsDatabaseService.getVideos(currentStore.id);
      setVideos(data || []);
    } catch (err) {
      console.error('Erro ao carregar vídeos:', err);
      toast.error('Erro ao carregar vídeos.');
    }
  }, [currentStore?.id]);

  const loadStories = useCallback(async () => {
    if (!currentStore?.id) return;
    try {
      const data = await VidlyticsDatabaseService.getStories(currentStore.id);
      setStories(data || []);
    } catch (err) {
      console.error('Erro ao carregar stories:', err);
      toast.error('Erro ao carregar stories.');
    }
  }, [currentStore?.id]);

  const loadAppearance = useCallback(async () => {
    if (!currentStore?.id) return;
    try {
      const data = await VidlyticsDatabaseService.getAppearance(currentStore.id);
      if (data) {
        setAppearance(data);
        if (data.primary_color) setPrimaryColor(data.primary_color);
        if (data.secondary_color) setSecondaryColor(data.secondary_color);
        if (data.border_radius !== undefined) setBorderRadius(data.border_radius);
        if (data.position) setPosition(data.position as any);
      }
    } catch (err) {
      console.error('Erro ao carregar configurações de aparência:', err);
    }
  }, [currentStore?.id]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      if (loadingStores) return;

      if (!currentStore?.id) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        if (isMounted) setLoading(true);
        await Promise.allSettled([loadVideos(), loadStories(), loadAppearance()]);
      } catch (err) {
        console.error('Erro ao inicializar Vidlytics:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, [currentStore?.id, loadingStores, loadVideos, loadStories, loadAppearance]);

  // --- AÇÕES DE VÍDEOS ---
  const handleCreateVideo = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id || !videoTitle.trim() || !videoUrl.trim()) return;

    try {
      await VidlyticsDatabaseService.createVideo({
        store_id: currentStore.id,
        title: videoTitle.trim(),
        video_url: videoUrl.trim(),
        active: true,
      });

      toast.success('Vídeo adicionado com sucesso!');
      setVideoTitle('');
      setVideoUrl('');
      setIsVideoModalOpen(false);
      await loadVideos();
    } catch (err: any) {
      console.error('Erro ao adicionar vídeo:', err);
      toast.error(err.message || 'Erro ao adicionar vídeo.');
    }
  }, [currentStore?.id, videoTitle, videoUrl, loadVideos]);

  const handleToggleVideoStatus = useCallback(async (videoId: string, currentStatus: boolean) => {
    try {
      await VidlyticsDatabaseService.updateVideo(videoId, { active: !currentStatus });
      setVideos((prev) =>
        prev.map((v) => (v.id === videoId ? { ...v, active: !currentStatus } : v))
      );
      toast.success(`Vídeo ${!currentStatus ? 'ativado' : 'pausado'} com sucesso!`);
    } catch (err) {
      console.error('Erro ao alterar status:', err);
      toast.error('Erro ao alterar status do vídeo.');
    }
  }, []);

  const handleDeleteVideo = useCallback(async (videoId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este vídeo?')) return;
    try {
      await VidlyticsDatabaseService.deleteVideo(videoId);
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      toast.success('Vídeo excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir vídeo:', err);
      toast.error('Erro ao excluir vídeo.');
    }
  }, []);

  // --- AÇÕES DE STORIES ---
  const handleCreateStory = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id || !storyTitle.trim()) return;

    try {
      await VidlyticsDatabaseService.createStory({
        store_id: currentStore.id,
        title: storyTitle.trim(),
        active: true,
        position: stories.length,
      });

      toast.success('Grupo de Stories adicionado!');
      setStoryTitle('');
      setIsStoryModalOpen(false);
      await loadStories();
    } catch (err: any) {
      console.error('Erro ao adicionar story:', err);
      toast.error(err.message || 'Erro ao criar grupo de stories.');
    }
  }, [currentStore?.id, storyTitle, stories.length, loadStories]);

  const handleDeleteStory = useCallback(async (storyId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este grupo de stories?')) return;
    try {
      await VidlyticsDatabaseService.deleteStory(storyId);
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      toast.success('Story excluído com sucesso!');
    } catch (err) {
      console.error('Erro ao excluir story:', err);
      toast.error('Erro ao excluir story.');
    }
  }, []);

  // --- AÇÕES DO WIDGET ---
  const handleSaveWidgetAppearance = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!currentStore?.id) return;

    try {
      await VidlyticsDatabaseService.upsertAppearance(currentStore.id, {
        primary_color: primaryColor,
        secondary_color: secondaryColor,
        border_radius: borderRadius,
        position: position,
      });
      toast.success('Configurações de aparência salvas!');
    } catch (err) {
      console.error('Erro ao salvar aparência:', err);
      toast.error('Erro ao salvar as configurações.');
    }
  }, [currentStore?.id, primaryColor, secondaryColor, borderRadius, position]);

  const embedScript = useMemo(() => {
    return `<script src="${window.location.origin}/widgets/sll-loader.js" data-store-id="${currentStore?.id || ''}" async></script>`;
  }, [currentStore?.id]);

  const handleCopyScript = useCallback(() => {
    navigator.clipboard.writeText(embedScript);
    toast.success('Script copiado para a área de transferência!');
  }, [embedScript]);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0094eb]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vidlytics</h1>
          <p className="text-slate-500 text-sm">
            Engaje e converta visitantes em sua loja usando vídeos curtos e stories dinâmicos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'videos' && (
            <button
              onClick={() => setIsVideoModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0094eb] hover:bg-[#0080cc] text-white rounded-lg font-medium text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={16} /> Adicionar Vídeo
            </button>
          )}

          {activeTab === 'stories' && (
            <button
              onClick={() => setIsStoryModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#0094eb] hover:bg-[#0080cc] text-white rounded-lg font-medium text-sm transition-colors shadow-sm cursor-pointer"
            >
              <Plus size={16} /> Novo Grupo de Stories
            </button>
          )}
        </div>
      </div>

      {/* Navegação por Abas */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-8">
        <button
          onClick={() => setActiveTab('videos')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'videos'
              ? 'border-[#0094eb] text-[#0094eb]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <PlaySquare size={16} /> Catálogo de Vídeos ({videos.length})
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'stories'
              ? 'border-[#0094eb] text-[#0094eb]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Layers size={16} /> Stories ({stories.length})
        </button>

        <button
          onClick={() => setActiveTab('appearance')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'appearance'
              ? 'border-[#0094eb] text-[#0094eb]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Sliders size={16} /> Aparência do Widget
        </button>

        <button
          onClick={() => setActiveTab('integration')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'integration'
              ? 'border-[#0094eb] text-[#0094eb]'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Code size={16} /> Integração / GTM
        </button>
      </div>

      {/* Conteúdo: VÍDEOS */}
      {activeTab === 'videos' && (
        <div>
          {videos.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1a1f2c] rounded-xl border border-slate-200 dark:border-slate-800 p-8">
              <PlaySquare size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="font-semibold text-lg">Nenhum vídeo cadastrado</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-4">
                Comece adicionando seu primeiro vídeo curto para exibir em carrossel ou pop-up em sua loja.
              </p>
              <button
                onClick={() => setIsVideoModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0094eb] text-white rounded-lg text-sm font-medium"
              >
                <Plus size={16} /> Adicionar Vídeo Agora
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {videos.map((vid) => (
                <VideoCardItem
                  key={vid.id}
                  video={vid}
                  onToggleStatus={handleToggleVideoStatus}
                  onDelete={handleDeleteVideo}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo: STORIES */}
      {activeTab === 'stories' && (
        <div>
          {stories.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-[#1a1f2c] rounded-xl border border-slate-200 dark:border-slate-800 p-8">
              <Layers size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <h3 className="font-semibold text-lg">Nenhum story cadastrado</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-1 mb-4">
                Crie grupos de stories redondos idênticos ao Instagram no topo da sua loja.
              </p>
              <button
                onClick={() => setIsStoryModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#0094eb] text-white rounded-lg text-sm font-medium"
              >
                <Plus size={16} /> Criar Grupo de Stories
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {stories.map((story) => (
                <StoryCardItem
                  key={story.id}
                  story={story}
                  onDelete={handleDeleteStory}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Conteúdo: APARÊNCIA */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSaveWidgetAppearance} className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-5">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Sliders size={20} className="text-[#0094eb]" />
                Personalização Visual
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cor Primária (Destaques e Botões)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Cor Secundária (Badges / Tags)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="w-10 h-10 rounded border border-slate-200 dark:border-slate-700 cursor-pointer p-0.5"
                    />
                    <input
                      type="text"
                      value={secondaryColor}
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Arredondamento das Bordas (px)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="32"
                    value={borderRadius}
                    onChange={(e) => setBorderRadius(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Posicionamento na Tela
                  </label>
                  <select
                    value={position}
                    onChange={(e: any) => setPosition(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-transparent"
                  >
                    <option value="bottom-right">Canto Inferior Direito</option>
                    <option value="bottom-left">Canto Inferior Esquerdo</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0094eb] hover:bg-[#0080cc] text-white rounded-lg text-sm font-medium transition-colors cursor-pointer shadow-sm"
                >
                  Salvar Preferências
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6">
            <h4 className="font-semibold text-sm mb-4">Pré-visualização</h4>
            <div className="bg-slate-100 dark:bg-slate-900 rounded-lg p-6 flex flex-col items-center justify-center min-h-[220px]">
              <div
                style={{
                  backgroundColor: primaryColor,
                  borderRadius: `${borderRadius}px`,
                }}
                className="w-24 h-36 shadow-lg flex items-center justify-center text-white relative transition-all"
              >
                <PlaySquare size={28} />
                <span
                  style={{ backgroundColor: secondaryColor }}
                  className="absolute bottom-2 text-[10px] font-bold px-2 py-0.5 rounded text-white"
                >
                  LIVE
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-4">Simulação do Card Flutuante</span>
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo: INTEGRAÇÃO */}
      {activeTab === 'integration' && (
        <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl p-6 space-y-6 max-w-3xl">
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2 mb-1">
              <Code size={20} className="text-[#0094eb]" />
              Instalação do Script Vidlytics
            </h3>
            <p className="text-sm text-slate-500">
              Copie o código abaixo e cole dentro da tag <code className="text-[#fd8539]">&lt;head&gt;</code> do seu tema da Nuvemshop, Shopify ou via Google Tag Manager (GTM).
            </p>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-lg text-xs overflow-x-auto font-mono">
              {embedScript}
            </pre>
            <button
              onClick={handleCopyScript}
              className="absolute top-2 right-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy size={13} /> Copiar Código
            </button>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-lg flex items-start gap-3">
            <CheckCircle2 size={18} className="text-[#0094eb] shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                Instalação Universal Inteligente (SLL Loader)
              </p>
              <p>
                O script acima é unificado. Uma vez instalado, qualquer alteração que você fizer nesta tela ou adição de vídeos/stories será refletida instantaneamente na loja dos seus clientes sem mexer em código novamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar Vídeo */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-base">Adicionar Novo Vídeo</h3>
              <button
                onClick={() => setIsVideoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVideo} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Vídeo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Vestido Floral Midi"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0094eb]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL do Vídeo (MP4, YouTube Shorts ou Reels)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://meusite.com/video.mp4"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0094eb]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsVideoModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0094eb] hover:bg-[#0080cc] text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Salvar Vídeo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Adicionar Story */}
      {isStoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a1f2c] border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h3 className="font-semibold text-base">Novo Grupo de Stories</h3>
              <button
                onClick={() => setIsStoryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStory} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Título do Story
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Lançamentos de Outono"
                  value={storyTitle}
                  onChange={(e) => setStoryTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:border-[#0094eb]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0094eb] hover:bg-[#0080cc] text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
                >
                  Criar Story
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


export default Vidlytics;
