import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  Layout,
  Send,
  Columns3,
  Grid3X3,
  Layers,
  Film,
  MapPin,
  Globe,
  Plus,
  X,
  Play,
  Trash2
} from 'lucide-react';
import { useLoja } from '../../../context/LojaContext';
import { VidlyticsDatabaseService } from '../../../services/vidlytics/VidlyticsDatabaseService';

interface NewStoryModalProps {
  isOpen: boolean;
  storyId?: string | null;
  onClose: () => void;
  onSaved?: () => void;
}

interface PickerVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
}

export default function NewStoryModal({ isOpen, storyId, onClose, onSaved }: NewStoryModalProps) {
  const { storeId } = useLoja();

  const [isActive, setIsActive] = useState(true);
  const [storyName, setStoryName] = useState('');
  const [selectedLayout, setSelectedLayout] = useState<'flutuante' | 'carrossel' | 'grade' | 'dinamico'>('carrossel');
  const [scrollDirection, setScrollDirection] = useState('Horizontal');
  const [visualStyle, setVisualStyle] = useState('Seguir Padrão do App');
  const [cssSelector, setCssSelector] = useState('');
  const [position, setPosition] = useState('Acima do elemento');
  const [pages, setPages] = useState<string[]>([]);
  const [newPage, setNewPage] = useState('');

  const [availableVideos, setAvailableVideos] = useState<PickerVideo[]>([]);
  const [selectedVideoUrls, setSelectedVideoUrls] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingStory, setLoadingStory] = useState(false);

  const resetForm = () => {
    setIsActive(true);
    setStoryName('');
    setSelectedLayout('carrossel');
    setScrollDirection('Horizontal');
    setVisualStyle('Seguir Padrão do App');
    setCssSelector('');
    setPosition('Acima do elemento');
    setPages([]);
    setSelectedVideoUrls([]);
  };

  const loadVideos = useCallback(async () => {
    if (!storeId) return;
    try {
      const videos = await VidlyticsDatabaseService.getVideosForPicker(storeId);
      setAvailableVideos(videos);
    } catch (err) {
      console.error('Erro ao buscar vídeos:', err);
    }
  }, [storeId]);

  const loadStory = useCallback(async () => {
    if (!storeId || !storyId) return;
    setLoadingStory(true);
    try {
      const story = await VidlyticsDatabaseService.getStoryById(storeId, storyId);
      if (story) {
        setStoryName(story.name);
        setIsActive(story.status === 'active');
        setSelectedLayout(story.layout);
        setScrollDirection(story.scrollDirection);
        setVisualStyle(story.visualStyle);
        setCssSelector(story.cssSelector);
        setPosition(story.displayPosition);
        setPages(story.pages || []);
        setSelectedVideoUrls((story.videos || []).map((v: any) => v.video_url));
      }
    } catch (err) {
      console.error('Erro ao carregar story:', err);
    } finally {
      setLoadingStory(false);
    }
  }, [storeId, storyId]);

  useEffect(() => {
    if (!isOpen) return;
    loadVideos();
    if (storyId) {
      loadStory();
    } else {
      resetForm();
    }
  }, [isOpen, storyId, loadVideos, loadStory]);

  if (!isOpen) return null;

  const handleAddPage = () => {
    if (newPage.trim() && !pages.includes(newPage.trim())) {
      setPages([...pages, newPage.trim()]);
      setNewPage('');
    }
  };

  const handleRemovePage = (page: string) => {
    setPages(pages.filter((p) => p !== page));
  };

  const toggleVideoSelection = (url: string) => {
    setSelectedVideoUrls((prev) =>
      prev.includes(url) ? prev.filter((v) => v !== url) : [...prev, url]
    );
  };

  const handleSave = async () => {
    if (!storeId) return;
    if (!storyName.trim()) {
      alert('Informe um nome para o Story.');
      return;
    }

    setSaving(true);
    try {
      await VidlyticsDatabaseService.saveStory(storeId, {
        id: storyId || undefined,
        name: storyName.trim(),
        status: isActive ? 'ATIVO' : 'INATIVO',
        layout: selectedLayout,
        scrollDirection,
        visualStyle,
        cssSelector,
        displayPosition: position,
        pages,
        videoUrls: selectedVideoUrls,
      });
      if (onSaved) onSaved();
    } catch (err) {
      console.error('Erro ao salvar story:', err);
      alert('Não foi possível salvar o Story. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const selectedVideosDetails = availableVideos.filter((v) => selectedVideoUrls.includes(v.videoUrl));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div
        className="bg-[#f8fafc] dark:bg-slate-900 w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 my-auto overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-600 dark:text-slate-300 cursor-pointer"
              title="Voltar"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
                {storyId ? 'Editar Story' : 'Novo Story'}
              </h2>
              <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {storyId ? 'EDITAR STORY' : 'CRIAR NOVO STORY'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700">
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 tracking-tight">
                STATUS: <span className={isActive ? "text-emerald-500 font-extrabold" : "text-slate-400"}>{isActive ? 'ATIVO' : 'INATIVO'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isActive ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isActive ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loadingStory && (
            <div className="text-center text-xs text-slate-400 py-4">Carregando dados do story...</div>
          )}

          {/* CARD 1: DESIGN E FORMATO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-5 border-b border-slate-100 dark:border-slate-800 text-[#0094eb]">
              <Layout className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">Design e Formato</h3>
            </div>

            <div className="pt-5 space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Nome do Story
                </label>
                <input
                  type="text"
                  value={storyName}
                  onChange={(e) => setStoryName(e.target.value)}
                  placeholder="Ex: Lançamentos"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Layout de Exibição
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedLayout('flutuante')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedLayout === 'flutuante'
                        ? 'border-[#0094eb] bg-sky-50/50 dark:bg-sky-950/20 text-[#0094eb]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Send className="w-6 h-6 mb-2" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Flutuante</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLayout('carrossel')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedLayout === 'carrossel'
                        ? 'border-[#0094eb] bg-sky-50/50 dark:bg-sky-950/20 text-[#0094eb]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Columns3 className="w-6 h-6 mb-2" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Carrossel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedLayout('grade')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedLayout === 'grade'
                        ? 'border-[#0094eb] bg-sky-50/50 dark:bg-sky-950/20 text-[#0094eb]'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800'
                    }`}
                  >
                    <Grid3X3 className="w-6 h-6 mb-2" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Grade</span>
                  </button>

                  <button
                    type="button"
                    disabled
                    className="flex flex-col items-center justify-center p-5 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800/40 text-slate-400"
                  >
                    <Layers className="w-6 h-6 mb-1 text-slate-400" />
                    <span className="text-[11px] font-bold tracking-wider uppercase">Carrossel Dinâmico</span>
                    <span className="text-[9px] text-slate-400 mt-1">Adicione 3 vídeos</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Direção de Rolagem
                </label>
                <select
                  value={scrollDirection}
                  onChange={(e) => setScrollDirection(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                >
                  <option value="Horizontal">Horizontal</option>
                  <option value="Vertical">Vertical</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Estilo Visual / Aparência
                </label>
                <select
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                >
                  <option value="Seguir Padrão do App">Seguir Padrão do App</option>
                  <option value="Customizado">Customizado</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARD 2: CONTEÚDO SELECIONADO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-[#0094eb]">
                <Film className="w-5 h-5" />
                <h3 className="text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">Conteúdo Selecionado</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showPicker ? 'FECHAR' : 'ADICIONAR VÍDEOS'}</span>
              </button>
            </div>

            <div className="pt-6 space-y-4">
              {selectedVideosDetails.length === 0 ? (
                <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-800/20">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                    <Film className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Nenhum vídeo selecionado</p>
                  <button
                    type="button"
                    onClick={() => setShowPicker(true)}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>ADICIONAR VÍDEOS</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {selectedVideosDetails.map((v) => (
                    <div key={v.id} className="relative group rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                      <div className="aspect-[9/16] bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                        {v.thumbnailUrl ? (
                          <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                        ) : (
                          <Play className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleVideoSelection(v.videoUrl)}
                        className="absolute top-1 right-1 p-1 bg-rose-500 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Remover"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 px-1.5 py-1 truncate">
                        {v.title}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {showPicker && (
                <div className="border border-slate-200 dark:border-slate-700 rounded-2xl p-4 max-h-64 overflow-y-auto space-y-2">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Selecione os vídeos da sua Biblioteca
                  </p>
                  {availableVideos.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Nenhum vídeo cadastrado na Biblioteca.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {availableVideos.map((v) => {
                        const checked = selectedVideoUrls.includes(v.videoUrl);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => toggleVideoSelection(v.videoUrl)}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all cursor-pointer ${
                              checked
                                ? 'border-[#0094eb] bg-sky-50 dark:bg-sky-950/20'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <div className="w-8 h-12 rounded-md bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {v.thumbnailUrl ? (
                                <img src={v.thumbnailUrl} alt={v.title} className="w-full h-full object-cover" />
                              ) : (
                                <Play className="w-3 h-3 text-slate-400" />
                              )}
                            </div>
                            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate">
                              {v.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* CARD 3: LOCAL DE EXIBIÇÃO */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-5 border-b border-slate-100 dark:border-slate-800 text-[#0094eb]">
              <MapPin className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">Local de Exibição</h3>
            </div>

            <div className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Seletor CSS
                </label>
                <input
                  type="text"
                  value={cssSelector}
                  onChange={(e) => setCssSelector(e.target.value)}
                  placeholder=".breadcrumbs"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Posição
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                >
                  <option value="Acima do elemento">Acima do elemento</option>
                  <option value="Abaixo do elemento">Abaixo do elemento</option>
                  <option value="Dentro do elemento (início)">Dentro do elemento (início)</option>
                  <option value="Dentro do elemento (fim)">Dentro do elemento (fim)</option>
                </select>
              </div>
            </div>
          </div>

          {/* CARD 4: QUAL PÁGINA IRÁ APARECER? */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center gap-2 pb-5 border-b border-slate-100 dark:border-slate-800 text-[#0094eb]">
              <Globe className="w-5 h-5" />
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-800 dark:text-slate-100">Qual página irá aparecer?</h3>
            </div>

            <div className="pt-5 space-y-3">
              {pages.length === 0 && (
                <p className="text-xs text-slate-400">Nenhuma página definida (o Story aparecerá em todas as páginas).</p>
              )}

              <div className="flex flex-wrap gap-2">
                {pages.map((page) => (
                  <span
                    key={page}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-[#0094eb] border border-sky-100 rounded-lg text-xs font-semibold"
                  >
                    {page}
                    <button
                      type="button"
                      onClick={() => handleRemovePage(page)}
                      className="text-[#0094eb] hover:text-rose-500 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPage}
                  onChange={(e) => setNewPage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPage()}
                  placeholder="Ex: /produto ou /home"
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0094eb]"
                />
                <button
                  type="button"
                  onClick={handleAddPage}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>ADICIONAR PÁGINA</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white dark:bg-slate-900 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] disabled:opacity-60 text-white font-bold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
