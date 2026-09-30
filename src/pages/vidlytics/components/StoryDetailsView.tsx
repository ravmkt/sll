import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Save,
  X,
  Layout,
  Layers,
  MousePointer2,
  Film,
  MapPin,
  Globe,
  CheckCircle2,
  Loader2,
  GripVertical,
  Rocket,
} from 'lucide-react';
import { useLoja } from '@/contexts/LojaContext';
import { VidlyticsDatabaseService } from '@/services/vidlytics/VidlyticsDatabaseService';

type PageRuleCondition = 'home' | 'all_pages' | 'url_contains' | 'url_not_contains' | 'url_not_equals';

interface PageRuleUi {
  id: string;
  condition_type: PageRuleCondition;
  value: string;
}

interface DisplayLocationUi {
  id: string;
  selector: string;
  position: 'beforebegin' | 'afterend';
}

interface StoryDetailsViewProps {
  storyId: string | null;
  onBack: () => void;
  onSaved: () => void;
}

const PAGE_RULE_OPTIONS: Array<{ label: string; value: PageRuleCondition }> = [
  { label: 'Somente na Home', value: 'home' },
  { label: 'Todas as páginas', value: 'all_pages' },
  { label: 'URL contém', value: 'url_contains' },
  { label: 'URL não contém', value: 'url_not_contains' },
  { label: 'URL diferente', value: 'url_not_equals' },
];

const CONDITION_TYPES_WITH_VALUE: PageRuleCondition[] = ['url_contains', 'url_not_contains', 'url_not_equals'];

const POSITION_OPTIONS = [
  { label: 'Acima do elemento', value: 'beforebegin' as const },
  { label: 'Abaixo do elemento', value: 'afterend' as const },
];

export default function StoryDetailsView({ storyId, onBack, onSaved }: StoryDetailsViewProps) {
  const { storeId, currentStore } = useLoja();
  const isCreate = !storyId;

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Formulário Principal
  const [formData, setFormData] = useState({
    title: '',
    format: 'carousel',
    scroll_direction: 'horizontal',
    active: true,
    appearance_id: '',
  });

  const [allVideos, setAllVideos] = useState<any[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);
  const [appearances, setAppearances] = useState<any[]>([]);
  const [location, setLocation] = useState<DisplayLocationUi>({
    id: crypto.randomUUID(),
    selector: '.breadcrumbs',
    position: 'beforebegin',
  });
  const [pageRules, setPageRules] = useState<PageRuleUi[]>([]);

  // Carregar dados
  const loadData = useCallback(async () => {
    if (!storeId) return;
    try {
      setLoading(true);
      const [videosRes, appsRes] = await Promise.all([
        VidlyticsDatabaseService.getVideos(storeId).catch(() => []),
        VidlyticsDatabaseService.getAppearances(storeId).catch(() => []),
      ]);

      setAllVideos(videosRes || []);
      setAppearances(appsRes || []);

      if (!isCreate && storyId) {
        const storiesRes = await VidlyticsDatabaseService.getStories(storeId);
        const currentStory = storiesRes.find((s: any) => s.id === storyId);

        if (currentStory) {
          setFormData({
            title: currentStory.name || currentStory.title || '',
            format: currentStory.layout || currentStory.format || 'carousel',
            scroll_direction: currentStory.scroll_direction || 'horizontal',
            active: currentStory.status === 'active' || currentStory.active === true,
            appearance_id: currentStory.appearance_id || '',
          });

          if (currentStory.cssSelector) {
            setLocation((prev) => ({
              ...prev,
              selector: currentStory.cssSelector,
              position: (currentStory.position as any) || 'beforebegin',
            }));
          }

          if (Array.isArray(currentStory.video_ids)) {
            setSelectedVideoIds(currentStory.video_ids);
          } else if (Array.isArray(currentStory.videos)) {
            setSelectedVideoIds(currentStory.videos.map((v: any) => v.id || v));
          }

          if (Array.isArray(currentStory.page_rules) && currentStory.page_rules.length > 0) {
            setPageRules(
              currentStory.page_rules.map((r: any) => ({
                id: r.id || crypto.randomUUID(),
                condition_type: r.condition_type || 'all_pages',
                value: r.value || '',
              }))
            );
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar dados do Story:', err);
    } finally {
      setLoading(false);
    }
  }, [storeId, storyId, isCreate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manipulação de Vídeos
  const handleToggleVideo = (videoId: string) => {
    setSelectedVideoIds((prev) =>
      prev.includes(videoId) ? prev.filter((id) => id !== videoId) : [...prev, videoId]
    );
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const sourceIndex = Number(e.dataTransfer.getData('text/plain'));
    if (sourceIndex === dropIndex) return;

    setSelectedVideoIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(dropIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  // Regras de Página
  const handleAddPageRule = () => {
    setPageRules((prev) => [
      ...prev,
      { id: crypto.randomUUID(), condition_type: 'all_pages', value: '' },
    ]);
  };

  const handleUpdatePageRule = (ruleId: string, patch: Partial<PageRuleUi>) => {
    setPageRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, ...patch } : r))
    );
  };

  const handleDeletePageRule = (ruleId: string) => {
    setPageRules((prev) => prev.filter((r) => r.id !== ruleId));
  };

  // Salvar
  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Por favor, informe o nome do Story.');
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        name: formData.title.trim(),
        title: formData.title.trim(),
        layout: formData.format,
        format: formData.format,
        scroll_direction: formData.scroll_direction,
        status: formData.active ? 'active' : 'inactive',
        active: formData.active,
        appearance_id: formData.appearance_id || null,
        cssSelector: location.selector.trim(),
        position: location.position,
        video_ids: selectedVideoIds,
        page_rules: pageRules,
      };

      if (isCreate) {
        await VidlyticsDatabaseService.createStory(storeId, payload);
      } else {
        await VidlyticsDatabaseService.updateStory(storeId, storyId!, payload);
      }

      onSaved();
    } catch (err) {
      console.error('Erro ao salvar story:', err);
      alert('Erro ao salvar as alterações do Story.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0094EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      {/* ── TOP HEADER ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black text-slate-900">
              {isCreate ? 'Novo Story' : 'Editar Story'}
            </h1>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {isCreate ? 'CRIAR NOVO STORY' : formData.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Switch */}
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                formData.active ? 'text-emerald-500' : 'text-slate-400'
              }`}
            >
              STATUS: {formData.active ? 'ATIVO' : 'INATIVO'}
            </span>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, active: !prev.active }))}
              className={`h-6 w-12 rounded-full p-1 transition-all duration-300 ${
                formData.active ? 'bg-emerald-500' : 'bg-slate-300'
              }`}
            >
              <div
                className={`h-4 w-4 rounded-full bg-white transition-all duration-300 ${
                  formData.active ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Badge Preview */}
          <div className="hidden rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 md:block">
            💾 SALVE PARA HABILITAR O PREVIEW
          </div>

          {/* Botão Salvar Topo */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-[#0094EB] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-md shadow-blue-100 transition hover:bg-[#0080cb] disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Salvar Alterações
          </button>
        </div>
      </div>

      {/* ── CARD 1: DESIGN E FORMATO ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
        <div className="mb-6 flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <Layout className="text-[#0094EB]" size={18} />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            DESIGN E FORMATO
          </h3>
        </div>

        <div className="space-y-6">
          {/* Nome */}
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">
              NOME DO STORY
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Lançamentos"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-xs font-bold text-slate-800 outline-none transition focus:border-[#0094EB] focus:bg-white"
            />
          </div>

          {/* Formatos / Layouts */}
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">
              LAYOUT DE EXIBIÇÃO
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { id: 'floating_widget', label: 'FLUTUANTE', icon: MousePointer2 },
                { id: 'carousel', label: 'CARROSSEL', icon: Layout },
                { id: 'grid', label: 'GRADE', icon: Layers },
                { id: 'dynamic_carousel', label: 'CARROSSEL DINÂMICO', icon: Layout, minVideos: 3 },
              ].map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = formData.format === fmt.id;
                const isDisabled = fmt.minVideos ? selectedVideoIds.length < fmt.minVideos : false;

                return (
                  <button
                    key={fmt.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setFormData((prev) => ({ ...prev, format: fmt.id }))}
                    className={`flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 p-5 text-center transition min-h-[115px] ${
                      isDisabled
                        ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300 opacity-60'
                        : isSelected
                        ? 'border-[#0094EB] bg-blue-50/30 text-[#0094EB]'
                        : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span className="text-[10px] font-black uppercase tracking-wider">
                      {fmt.label}
                    </span>
                    {fmt.minVideos && (
                      <span className="text-[9px] font-bold text-slate-400">
                        {isDisabled ? 'Adicione 3 vídeos' : `${selectedVideoIds.length} selecionados`}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Direção de Rolagem */}
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">
              DIREÇÃO DE ROLAGEM
            </label>
            <select
              value={formData.scroll_direction}
              onChange={(e) => setFormData((prev) => ({ ...prev, scroll_direction: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-[#0094EB]"
            >
              <option value="horizontal">Horizontal</option>
              <option value="vertical">Vertical</option>
            </select>
          </div>

          {/* Estilo Visual */}
          <div>
            <label className="mb-2 block text-[10px] font-black uppercase tracking-wider text-slate-400">
              ESTILO VISUAL / APARÊNCIA
            </label>
            <select
              value={formData.appearance_id}
              onChange={(e) => setFormData((prev) => ({ ...prev, appearance_id: e.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-800 outline-none focus:border-[#0094EB]"
            >
              <option value="">Seguir Padrão do App</option>
              {appearances.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} {app.is_default ? '(Padrão)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── CARD 2: CONTEÚDO SELECIONADO ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Layers className="text-[#0094EB]" size={18} />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                CONTEÚDO SELECIONADO
              </h3>
              {selectedVideoIds.length > 0 && (
                <p className="text-[10px] font-bold text-slate-400">
                  Arraste para reordenar os vídeos
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsGalleryOpen(true)}
            className="rounded-xl bg-[#0094EB] px-4 py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-xs hover:bg-[#0080cb]"
          >
            + ADICIONAR VÍDEOS
          </button>
        </div>

        {selectedVideoIds.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-5">
            {selectedVideoIds.map((vidId, index) => {
              const video = allVideos.find((v) => v.id === vidId);
              if (!video) return null;
              const poster = video.thumbnail_url || video.cover_url || video.video_url;
              const isDragging = dragIndex === index;

              return (
                <div
                  key={video.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`group relative aspect-[9/16] cursor-grab overflow-hidden rounded-2xl border-2 transition active:cursor-grabbing ${
                    isDragging
                      ? 'scale-105 border-[#0094EB] opacity-70 shadow-2xl'
                      : 'border-[#0094EB] shadow-md shadow-blue-50'
                  }`}
                >
                  {poster ? (
                    <img
                      src={poster}
                      alt={video.title || 'Vídeo'}
                      className="h-full w-full object-cover pointer-events-none"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                      <Film size={24} />
                    </div>
                  )}

                  {/* Badge de numeração */}
                  <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-[#0094EB] px-2 py-0.5 text-[9px] font-black text-white shadow">
                    <GripVertical size={10} />
                    {index + 1}
                  </div>

                  {/* Botão Remover */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleVideo(video.id);
                    }}
                    className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white opacity-0 transition hover:bg-rose-500 group-hover:opacity-100"
                  >
                    <X size={12} />
                  </button>

                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <p className="truncate text-[9px] font-black text-white">
                      {video.title || 'Sem título'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
            <Film size={32} className="text-slate-300" />
            <p className="mt-2 text-xs font-bold text-slate-400">Nenhum vídeo selecionado</p>
            <button
              type="button"
              onClick={() => setIsGalleryOpen(true)}
              className="mt-4 rounded-xl bg-[#0094EB] px-5 py-2 text-[10px] font-black uppercase tracking-wider text-white shadow-xs hover:bg-[#0080cb]"
            >
              + ADICIONAR VÍDEOS
            </button>
          </div>
        )}
      </div>

      {/* ── CARD 3: LOCAL DE EXIBIÇÃO ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
        <div className="mb-6 flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <MapPin className="text-[#0094EB]" size={18} />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            LOCAL DE EXIBIÇÃO
          </h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
          <div>
            <label className="mb-2 block text-[9px] font-black uppercase tracking-wider text-slate-400">
              SELETOR CSS
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={location.selector}
                onChange={(e) => setLocation((prev) => ({ ...prev, selector: e.target.value }))}
                placeholder=".breadcrumbs"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#0094EB]"
              />
              <button
                type="button"
                onClick={() => {
                  const url = currentStore?.url || (currentStore as any)?.store_url || '';
                  if (!url) {
                    alert('Por favor, informe a URL da loja nas Configurações.');
                    return;
                  }
                  window.open(url, '_blank');
                }}
                className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-[#0094EB] hover:bg-blue-50 transition"
              >
                🎯 Selecionar
              </button>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-[9px] font-black uppercase tracking-wider text-slate-400">
              POSIÇÃO
            </label>
            <select
              value={location.position}
              onChange={(e) => setLocation((prev) => ({ ...prev, position: e.target.value as any }))}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:border-[#0094EB]"
            >
              {POSITION_OPTIONS.map((pos) => (
                <option key={pos.value} value={pos.value}>
                  {pos.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── CARD 4: QUAL PÁGINA IRÁ APARECER? ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
        <div className="mb-6 flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <Globe className="text-[#0094EB]" size={18} />
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
            QUAL PÁGINA IRÁ APARECER?
          </h3>
        </div>

        <div className="space-y-3">
          {pageRules.map((rule) => (
            <div
              key={rule.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 sm:flex-row sm:items-center"
            >
              <div className="w-full sm:w-56">
                <select
                  value={rule.condition_type}
                  onChange={(e) =>
                    handleUpdatePageRule(rule.id, { condition_type: e.target.value as any })
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0094EB]"
                >
                  {PAGE_RULE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {CONDITION_TYPES_WITH_VALUE.includes(rule.condition_type) && (
                <div className="flex-1">
                  <input
                    type="text"
                    value={rule.value}
                    onChange={(e) => handleUpdatePageRule(rule.id, { value: e.target.value })}
                    placeholder="/colecao, /produto ou trecho da URL"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-[#0094EB]"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={() => handleDeletePageRule(rule.id)}
                className="self-end rounded-xl border border-rose-100 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-rose-500 hover:bg-rose-50 sm:self-auto"
              >
                Remover
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddPageRule}
            className="rounded-xl bg-[#0094EB] px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-xs hover:bg-[#0080cb]"
          >
            + ADICIONAR PÁGINA
          </button>
        </div>
      </div>

      {/* ── FOOTER ACTIONS ── */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-[#0094EB] px-8 py-3 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-blue-100 hover:bg-[#0080cb] disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Salvar Alterações
        </button>
      </div>

      {/* ── MODAL GALERIA DE VÍDEOS ── */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900">Selecionar Vídeos</h3>
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {allVideos.length > 0 ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
                  {allVideos.map((vid) => {
                    const isSelected = selectedVideoIds.includes(vid.id);
                    const poster = vid.thumbnail_url || vid.cover_url || vid.video_url;

                    return (
                      <button
                        key={vid.id}
                        type="button"
                        onClick={() => handleToggleVideo(vid.id)}
                        className={`group relative aspect-[9/16] overflow-hidden rounded-xl border-2 text-left transition ${
                          isSelected
                            ? 'border-[#0094EB] ring-2 ring-[#0094EB]/30'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {poster ? (
                          <img
                            src={poster}
                            alt={vid.title || 'Vídeo'}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-400">
                            <Film size={20} />
                          </div>
                        )}

                        <div
                          className={`absolute inset-0 flex items-center justify-center transition ${
                            isSelected ? 'bg-[#0094EB]/20' : 'bg-transparent group-hover:bg-black/10'
                          }`}
                        >
                          {isSelected && (
                            <div className="rounded-full bg-[#0094EB] p-1 text-white shadow">
                              <CheckCircle2 size={16} />
                            </div>
                          )}
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                          <p className="truncate text-[9px] font-black text-white">
                            {vid.title || 'Sem título'}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center text-sm font-bold text-slate-400">
                  Nenhum vídeo cadastrado na biblioteca.
                </div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => setIsGalleryOpen(false)}
                className="rounded-xl bg-[#0094EB] px-5 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-[#0080cb]"
              >
                Concluir ({selectedVideoIds.length} selecionados)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
