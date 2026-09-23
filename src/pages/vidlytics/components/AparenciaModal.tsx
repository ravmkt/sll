import React, { useState, useEffect } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Tv, 
  Columns, 
  Sparkles, 
  LayoutGrid, 
  PlaySquare, 
  Smartphone, 
  Monitor, 
  ChevronDown, 
  ChevronUp, 
  Heart, 
  MessageSquare, 
  Share2, 
  RotateCcw,
  Play,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export interface FloatingDeviceConfig {
  shape: 'portrait' | 'landscape' | 'square' | 'circle';
  width: string;
  height: string;
  border_radius: string;
  border_width: string;
  border_color: string;
  border_style: 'solid' | 'dashed' | 'dotted';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  margin_x: string;
  margin_y: string;
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  title_text: string;
  title_color: string;
  title_size: string;
  title_bg: string;
  title_bg_opacity: number;
  badge_text: string;
  badge_color: string;
  badge_bg: string;
  badge_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  badge_show: boolean;
  cta_text: string;
  cta_color: string;
  cta_bg: string;
  cta_border_radius: string;
  cta_show: boolean;
}

export interface CarouselDeviceConfig {
  shape: 'portrait' | 'landscape' | 'square' | 'circle';
  card_width: string;
  card_height: string;
  border_radius: string;
  border_width: string;
  border_color: string;
  border_style: 'solid' | 'dashed' | 'dotted';
  spacing: number;
  visible_items: number;
  shadow: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  title_size: string;
  title_color: string;
  title_bg: string;
  title_bg_opacity: number;
  title_alignment: 'left' | 'center' | 'right';
  title_show: boolean;
  badge_text: string;
  badge_color: string;
  badge_bg: string;
  badge_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  badge_show: boolean;
  cta_text: string;
  cta_color: string;
  cta_bg: string;
  cta_border_radius: string;
  cta_show: boolean;
}

export interface GridDeviceConfig extends CarouselDeviceConfig {
  rows: number;
}

export interface ModalConfig {
  border_radius: string;
  border_width: string;
  border_color: string;
  border_style: 'solid' | 'dashed' | 'dotted';
  overlay_color: string;
  overlay_opacity: number;
  close_button_color: string;
  close_button_bg: string;
  like_button_show: boolean;
  like_button_color: string;
  comments_show: boolean;
  comments_color: string;
  share_button_show: boolean;
  share_button_color: string;
  cta_text: string;
  cta_color: string;
  cta_bg: string;
  cta_border_radius: string;
  cta_show: boolean;
}

export interface ExtendedAppearance {
  id?: string;
  store_id: string;
  name: string;
  is_default: boolean;
  primary_color: string;
  useGlobalAppearance: boolean;
  floating_config: { desktop: FloatingDeviceConfig; mobile: FloatingDeviceConfig };
  carousel_config: { desktop: CarouselDeviceConfig; mobile: CarouselDeviceConfig };
  dynamic_carousel_config: { desktop: CarouselDeviceConfig; mobile: CarouselDeviceConfig };
  grid_config: { desktop: GridDeviceConfig; mobile: GridDeviceConfig };
  modal_config: ModalConfig;
}

export const defaultFloatingDevice: FloatingDeviceConfig = {
  shape: 'portrait',
  width: '90',
  height: '160',
  border_radius: '16',
  border_width: '2',
  border_color: '#0094eb',
  border_style: 'solid',
  position: 'bottom-right',
  margin_x: '20',
  margin_y: '20',
  shadow: 'lg',
  title_text: 'Assista agora',
  title_color: '#ffffff',
  title_size: '12',
  title_bg: '#000000',
  title_bg_opacity: 60,
  badge_text: 'AO VIVO',
  badge_color: '#ffffff',
  badge_bg: '#ef4444',
  badge_position: 'top-left',
  badge_show: true,
  cta_text: 'Comprar',
  cta_color: '#ffffff',
  cta_bg: '#0094eb',
  cta_border_radius: '8',
  cta_show: true,
};

export const defaultCarouselDevice: CarouselDeviceConfig = {
  shape: 'portrait',
  card_width: '180',
  card_height: '320',
  border_radius: '16',
  border_width: '1',
  border_color: '#e2e8f0',
  border_style: 'solid',
  spacing: 16,
  visible_items: 4,
  shadow: 'md',
  title_size: '14',
  title_color: '#ffffff',
  title_bg: '#000000',
  title_bg_opacity: 50,
  title_alignment: 'left',
  title_show: true,
  badge_text: 'NOVO',
  badge_color: '#ffffff',
  badge_bg: '#fd8539',
  badge_position: 'top-left',
  badge_show: true,
  cta_text: 'Ver Produto',
  cta_color: '#ffffff',
  cta_bg: '#0094eb',
  cta_border_radius: '8',
  cta_show: true,
};

export const defaultGridDevice: GridDeviceConfig = {
  ...defaultCarouselDevice,
  rows: 2,
  visible_items: 4,
};

export const defaultModalConfig: ModalConfig = {
  border_radius: '20',
  border_width: '0',
  border_color: '#000000',
  border_style: 'solid',
  overlay_color: '#000000',
  overlay_opacity: 80,
  close_button_color: '#ffffff',
  close_button_bg: 'rgba(0,0,0,0.4)',
  like_button_show: true,
  like_button_color: '#ffffff',
  comments_show: true,
  comments_color: '#ffffff',
  share_button_show: true,
  share_button_color: '#ffffff',
  cta_text: 'Eu Quero',
  cta_color: '#ffffff',
  cta_bg: '#0094eb',
  cta_border_radius: '12',
  cta_show: true,
};

export const getInitialFormData = (storeId: string): ExtendedAppearance => ({
  store_id: storeId,
  name: '',
  is_default: false,
  primary_color: '#0094eb',
  useGlobalAppearance: false,
  floating_config: { desktop: { ...defaultFloatingDevice }, mobile: { ...defaultFloatingDevice, width: '70', height: '124' } },
  carousel_config: { desktop: { ...defaultCarouselDevice }, mobile: { ...defaultCarouselDevice, visible_items: 2, card_width: '140', card_height: '248' } },
  dynamic_carousel_config: { desktop: { ...defaultCarouselDevice }, mobile: { ...defaultCarouselDevice, visible_items: 2, card_width: '140', card_height: '248' } },
  grid_config: { desktop: { ...defaultGridDevice }, mobile: { ...defaultGridDevice, visible_items: 2, rows: 2 } },
  modal_config: { ...defaultModalConfig },
});

type TabType = 'basico' | 'flutuante' | 'carrossel' | 'carrossel-dinamico' | 'grade' | 'player';

interface AparenciaModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  storeId: string;
  initialData?: ExtendedAppearance | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const AparenciaModal: React.FC<AparenciaModalProps> = ({
  isOpen,
  mode,
  storeId,
  initialData,
  onClose,
  onSuccess
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('basico');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');
  const [formData, setFormData] = useState<ExtendedAppearance>(getInitialFormData(storeId));
  const [isSaving, setIsSaving] = useState(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    shape: true,
    title: false,
    badge: false,
    cta: false,
    position: false,
    modalControls: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData(getInitialFormData(storeId));
    }
    setActiveTab('basico');
  }, [initialData, storeId, isOpen]);

  if (!isOpen) return null;

  const currentDev = previewDevice;

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateFloating = (key: keyof FloatingDeviceConfig, value: any) => {
    setFormData(prev => {
      const next = { ...prev };
      next.floating_config[currentDev] = { ...next.floating_config[currentDev], [key]: value };
      if (prev.useGlobalAppearance) {
        const otherDev = currentDev === 'mobile' ? 'desktop' : 'mobile';
        next.floating_config[otherDev] = { ...next.floating_config[otherDev], [key]: value };
      }
      return next;
    });
  };

  const updateCarousel = (key: keyof CarouselDeviceConfig, value: any) => {
    setFormData(prev => {
      const next = { ...prev };
      next.carousel_config[currentDev] = { ...next.carousel_config[currentDev], [key]: value };
      if (prev.useGlobalAppearance) {
        const otherDev = currentDev === 'mobile' ? 'desktop' : 'mobile';
        next.carousel_config[otherDev] = { ...next.carousel_config[otherDev], [key]: value };
      }
      return next;
    });
  };

  const updateDynamic = (key: keyof CarouselDeviceConfig, value: any) => {
    setFormData(prev => {
      const next = { ...prev };
      next.dynamic_carousel_config[currentDev] = { ...next.dynamic_carousel_config[currentDev], [key]: value };
      if (prev.useGlobalAppearance) {
        const otherDev = currentDev === 'mobile' ? 'desktop' : 'mobile';
        next.dynamic_carousel_config[otherDev] = { ...next.dynamic_carousel_config[otherDev], [key]: value };
      }
      return next;
    });
  };

  const updateGrid = (key: keyof GridDeviceConfig, value: any) => {
    setFormData(prev => {
      const next = { ...prev };
      next.grid_config[currentDev] = { ...next.grid_config[currentDev], [key]: value };
      if (prev.useGlobalAppearance) {
        const otherDev = currentDev === 'mobile' ? 'desktop' : 'mobile';
        next.grid_config[otherDev] = { ...next.grid_config[otherDev], [key]: value };
      }
      return next;
    });
  };

  const updateModal = (key: keyof ModalConfig, value: any) => {
    setFormData(prev => ({
      ...prev,
      modal_config: { ...prev.modal_config, [key]: value }
    }));
  };

  const handleResetCurrentTab = () => {
    if (activeTab === 'flutuante') {
      setFormData(prev => ({
        ...prev,
        floating_config: { desktop: { ...defaultFloatingDevice }, mobile: { ...defaultFloatingDevice, width: '70', height: '124' } }
      }));
    } else if (activeTab === 'carrossel') {
      setFormData(prev => ({
        ...prev,
        carousel_config: { desktop: { ...defaultCarouselDevice }, mobile: { ...defaultCarouselDevice, visible_items: 2, card_width: '140', card_height: '248' } }
      }));
    } else if (activeTab === 'carrossel-dinamico') {
      setFormData(prev => ({
        ...prev,
        dynamic_carousel_config: { desktop: { ...defaultCarouselDevice }, mobile: { ...defaultCarouselDevice, visible_items: 2, card_width: '140', card_height: '248' } }
      }));
    } else if (activeTab === 'grade') {
      setFormData(prev => ({
        ...prev,
        grid_config: { desktop: { ...defaultGridDevice }, mobile: { ...defaultGridDevice, visible_items: 2, rows: 2 } }
      }));
    } else if (activeTab === 'player') {
      setFormData(prev => ({
        ...prev,
        modal_config: { ...defaultModalConfig }
      }));
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Por favor, informe o nome do estilo.');
      return;
    }
    setIsSaving(true);
    try {
      if (formData.is_default) {
        await supabase
          .schema('vidlytics')
          .from('appearances')
          .update({ is_default: false })
          .eq('store_id', storeId);
      }

      const payload = {
        store_id: storeId,
        name: formData.name.trim(),
        is_default: formData.is_default,
        primary_color: formData.primary_color,
        floating_config: formData.floating_config,
        carousel_config: formData.carousel_config,
        dynamic_carousel_config: formData.dynamic_carousel_config,
        grid_config: formData.grid_config,
        modal_config: formData.modal_config,
        use_global_appearance: formData.useGlobalAppearance,
      };

      if (mode === 'create') {
        const { error } = await supabase.schema('vidlytics').from('appearances').insert([payload]);
        if (error) throw error;
      } else if (mode === 'edit' && formData.id) {
        const { error } = await supabase.schema('vidlytics').from('appearances').update(payload).eq('id', formData.id);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert('Erro ao salvar estilo: ' + (err?.message || 'Falha na comunicação'));
    } finally {
      setIsSaving(false);
    }
  };

  const renderColorInput = (value: string, onChange: (val: string) => void) => (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value.startsWith('#') ? value : '#0094eb'}
        onChange={e => onChange(e.target.value)}
        className="w-8 h-8 rounded-lg border border-slate-200 cursor-pointer p-0.5 bg-white shrink-0"
      />
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:border-[#0094eb]"
      />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-[96vw] max-w-[1500px] rounded-3xl shadow-2xl flex flex-col h-[92vh] overflow-hidden border border-slate-200">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {mode === 'create' ? 'Novo Estilo de Aparência' : `Editando: ${formData.name}`}
            </h2>
            <p className="text-xs text-slate-400">Configure layouts, cores e tipografia de cada formato dos vídeos.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ABAS DO MODAL */}
        <div className="flex items-center justify-between px-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex gap-1 overflow-x-auto py-2">
            {[
              { id: 'basico', label: 'Básico', icon: SlidersHorizontal },
              { id: 'flutuante', label: 'Flutuante', icon: Tv },
              { id: 'carrossel', label: 'Carrossel', icon: Columns },
              { id: 'carrossel-dinamico', label: 'Carrossel Dinâmico', icon: Sparkles },
              { id: 'grade', label: 'Grade', icon: LayoutGrid },
              { id: 'player', label: 'Player (Modal)', icon: PlaySquare },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#0094eb] text-white shadow-sm shadow-[#0094eb]/30'
                      : 'text-slate-600 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setPreviewDevice('mobile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                previewDevice === 'mobile' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" /> Mobile
            </button>
            <button
              onClick={() => setPreviewDevice('desktop')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                previewDevice === 'desktop' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" /> Desktop
            </button>
          </div>
        </div>

        {/* CORPO: CONTROLES À ESQUERDA + PREVIEW À DIREITA */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* PAINEL DE CONTROLES */}
          <div className="lg:col-span-5 xl:col-span-4 p-5 overflow-y-auto border-r border-slate-100 bg-white space-y-4">
            
            {/* ABA 1: BÁSICO */}
            {activeTab === 'basico' && (
              <div className="space-y-4 animate-in fade-in">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Nome do Estilo</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Padrão da Loja / Black Friday"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0094eb]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Cor Principal (Global)</label>
                  {renderColorInput(formData.primary_color, val => setFormData(p => ({ ...p, primary_color: val })))}
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.is_default}
                      onChange={e => setFormData(p => ({ ...p, is_default: e.target.checked }))}
                      className="rounded text-[#0094eb] focus:ring-[#0094eb]"
                    />
                    Definir este estilo como Padrão da Loja
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6">
                    Vídeos e coleções sem estilo definido usarão automaticamente este modelo.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.useGlobalAppearance}
                      onChange={e => setFormData(p => ({ ...p, useGlobalAppearance: e.target.checked }))}
                      className="rounded text-[#0094eb] focus:ring-[#0094eb]"
                    />
                    Sincronizar configurações (Desktop = Mobile)
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6">
                    Ao alterar tamanhos e bordas no Desktop, refletirá automaticamente no Mobile.
                  </p>
                </div>
              </div>
            )}

            {/* ABA 2: FLUTUANTE */}
            {activeTab === 'flutuante' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    onClick={() => toggleAccordion('shape')}
                    className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60"
                  >
                    <span>Formato e Dimensões</span>
                    {openAccordions.shape ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openAccordions.shape && (
                    <div className="p-3.5 pt-0 space-y-3 border-t border-slate-100/60 bg-white">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Formato</label>
                        <select
                          value={formData.floating_config[currentDev].shape}
                          onChange={e => updateFloating('shape', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        >
                          <option value="portrait">Retrato (9:16)</option>
                          <option value="landscape">Paisagem (16:9)</option>
                          <option value="square">Quadrado (1:1)</option>
                          <option value="circle">Círculo</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Largura (px)</label>
                          <input
                            type="text"
                            value={formData.floating_config[currentDev].width}
                            onChange={e => updateFloating('width', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Altura (px)</label>
                          <input
                            type="text"
                            value={formData.floating_config[currentDev].height}
                            onChange={e => updateFloating('height', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Raio Cantos (px)</label>
                          <input
                            type="text"
                            value={formData.floating_config[currentDev].border_radius}
                            onChange={e => updateFloating('border_radius', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Sombra</label>
                          <select
                            value={formData.floating_config[currentDev].shadow}
                            onChange={e => updateFloating('shadow', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                          >
                            <option value="none">Nenhuma</option>
                            <option value="sm">Suave</option>
                            <option value="md">Média</option>
                            <option value="lg">Grande</option>
                            <option value="xl">Extra Grande</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Cor da Borda</label>
                        {renderColorInput(formData.floating_config[currentDev].border_color, v => updateFloating('border_color', v))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    onClick={() => toggleAccordion('position')}
                    className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60"
                  >
                    <span>Posição na Tela</span>
                    {openAccordions.position ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openAccordions.position && (
                    <div className="p-3.5 pt-0 space-y-3 border-t border-slate-100/60 bg-white">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Canto</label>
                        <select
                          value={formData.floating_config[currentDev].position}
                          onChange={e => updateFloating('position', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        >
                          <option value="bottom-right">Inferior Direito</option>
                          <option value="bottom-left">Inferior Esquerdo</option>
                          <option value="top-right">Superior Direito</option>
                          <option value="top-left">Superior Esquerdo</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Margem X (px)</label>
                          <input
                            type="text"
                            value={formData.floating_config[currentDev].margin_x}
                            onChange={e => updateFloating('margin_x', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-600">Margem Y (px)</label>
                          <input
                            type="text"
                            value={formData.floating_config[currentDev].margin_y}
                            onChange={e => updateFloating('margin_y', e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    onClick={() => toggleAccordion('badge')}
                    className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60"
                  >
                    <span>Badge (Selo)</span>
                    {openAccordions.badge ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openAccordions.badge && (
                    <div className="p-3.5 pt-0 space-y-3 border-t border-slate-100/60 bg-white">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.floating_config[currentDev].badge_show}
                          onChange={e => updateFloating('badge_show', e.target.checked)}
                          className="rounded text-[#0094eb]"
                        />
                        Exibir Selo no Vídeo
                      </label>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Texto do Selo</label>
                        <input
                          type="text"
                          value={formData.floating_config[currentDev].badge_text}
                          onChange={e => updateFloating('badge_text', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Cor de Fundo do Selo</label>
                        {renderColorInput(formData.floating_config[currentDev].badge_bg, v => updateFloating('badge_bg', v))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ABA 3: CARROSSEL */}
            {activeTab === 'carrossel' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Formato do Card</label>
                  <select
                    value={formData.carousel_config[currentDev].shape}
                    onChange={e => updateCarousel('shape', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="portrait">Retrato (9:16)</option>
                    <option value="landscape">Paisagem (16:9)</option>
                    <option value="square">Quadrado (1:1)</option>
                    <option value="circle">Círculo</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Itens Visíveis</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={formData.carousel_config[currentDev].visible_items}
                      onChange={e => updateCarousel('visible_items', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Espaço entre Cards (px)</label>
                    <input
                      type="number"
                      value={formData.carousel_config[currentDev].spacing}
                      onChange={e => updateCarousel('spacing', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Raio Cantos (px)</label>
                  <input
                    type="text"
                    value={formData.carousel_config[currentDev].border_radius}
                    onChange={e => updateCarousel('border_radius', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Cor da Borda</label>
                  {renderColorInput(formData.carousel_config[currentDev].border_color, v => updateCarousel('border_color', v))}
                </div>
              </div>
            )}

            {/* ABA 4: CARROSSEL DINÂMICO */}
            {activeTab === 'carrossel-dinamico' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs">
                  O Carrossel Dinâmico se adapta automaticamente aos produtos da página onde o widget é inserido.
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Formato dos Cards</label>
                  <select
                    value={formData.dynamic_carousel_config[currentDev].shape}
                    onChange={e => updateDynamic('shape', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="portrait">Retrato (9:16)</option>
                    <option value="landscape">Paisagem (16:9)</option>
                    <option value="square">Quadrado (1:1)</option>
                    <option value="circle">Círculo</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Itens Visíveis</label>
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={formData.dynamic_carousel_config[currentDev].visible_items}
                      onChange={e => updateDynamic('visible_items', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Espaço (px)</label>
                    <input
                      type="number"
                      value={formData.dynamic_carousel_config[currentDev].spacing}
                      onChange={e => updateDynamic('spacing', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Cor da Borda</label>
                  {renderColorInput(formData.dynamic_carousel_config[currentDev].border_color, v => updateDynamic('border_color', v))}
                </div>
              </div>
            )}

            {/* ABA 5: GRADE */}
            {activeTab === 'grade' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Formato</label>
                  <select
                    value={formData.grid_config[currentDev].shape}
                    onChange={e => updateGrid('shape', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="portrait">Retrato (9:16)</option>
                    <option value="landscape">Paisagem (16:9)</option>
                    <option value="square">Quadrado (1:1)</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Colunas</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={formData.grid_config[currentDev].visible_items}
                      onChange={e => updateGrid('visible_items', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Linhas</label>
                    <input
                      type="number"
                      min={1}
                      max={6}
                      value={formData.grid_config[currentDev].rows}
                      onChange={e => updateGrid('rows', parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Espaço entre Vídeos (px)</label>
                  <input
                    type="number"
                    value={formData.grid_config[currentDev].spacing}
                    onChange={e => updateGrid('spacing', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Cor da Borda</label>
                  {renderColorInput(formData.grid_config[currentDev].border_color, v => updateGrid('border_color', v))}
                </div>
              </div>
            )}

            {/* ABA 6: PLAYER */}
            {activeTab === 'player' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Raio do Modal (px)</label>
                  <input
                    type="text"
                    value={formData.modal_config.border_radius}
                    onChange={e => updateModal('border_radius', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div className="border border-slate-100 rounded-2xl overflow-hidden bg-slate-50/50">
                  <button
                    onClick={() => toggleAccordion('modalControls')}
                    className="w-full flex items-center justify-between p-3.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60"
                  >
                    <span>Botões de Interação no Player</span>
                    {openAccordions.modalControls ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {openAccordions.modalControls && (
                    <div className="p-3.5 pt-0 space-y-3 border-t border-slate-100/60 bg-white">
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.modal_config.like_button_show}
                          onChange={e => updateModal('like_button_show', e.target.checked)}
                          className="rounded text-[#0094eb]"
                        />
                        Exibir Curtidas (Like)
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.modal_config.comments_show}
                          onChange={e => updateModal('comments_show', e.target.checked)}
                          className="rounded text-[#0094eb]"
                        />
                        Exibir Comentários
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.modal_config.share_button_show}
                          onChange={e => updateModal('share_button_show', e.target.checked)}
                          className="rounded text-[#0094eb]"
                        />
                        Exibir Compartilhar
                      </label>
                      <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.modal_config.cta_show}
                          onChange={e => updateModal('cta_show', e.target.checked)}
                          className="rounded text-[#0094eb]"
                        />
                        Exibir Botão de Ação (CTA)
                      </label>
                      {formData.modal_config.cta_show && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-600">Texto do CTA</label>
                            <input
                              type="text"
                              value={formData.modal_config.cta_text}
                              onChange={e => updateModal('cta_text', e.target.value)}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[11px] font-bold text-slate-600">Cor do CTA</label>
                            {renderColorInput(formData.modal_config.cta_bg, v => updateModal('cta_bg', v))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* BOTÃO RESTAURAR PADRÕES DA ABA ATUAL */}
            {activeTab !== 'basico' && (
              <button
                type="button"
                onClick={handleResetCurrentTab}
                className="w-full py-2 px-3 text-xs font-semibold text-slate-500 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Restaurar padrões desta aba
              </button>
            )}
          </div>

          {/* PAINEL DE PREVIEW INTERATIVO */}
          <div className="lg:col-span-7 xl:col-span-8 bg-slate-100/70 p-6 flex items-center justify-center relative overflow-hidden">
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-xs px-3 py-1 rounded-full text-[11px] font-bold text-slate-500 shadow-xs border border-slate-200">
              Visualização ao Vivo ({previewDevice.toUpperCase()})
            </div>

            {/* FLUTUANTE PREVIEW */}
            {activeTab === 'flutuante' && (
              <div className="relative w-full h-[520px] max-w-[700px] bg-white rounded-2xl border border-slate-200 shadow-sm p-4 overflow-hidden flex flex-col justify-between">
                <div className="h-6 w-1/3 bg-slate-100 rounded-md" />
                <div className="space-y-2">
                  <div className="h-4 w-2/3 bg-slate-50 rounded" />
                  <div className="h-4 w-1/2 bg-slate-50 rounded" />
                </div>
                
                {/* WIDGET FLUTUANTE SIMULADO */}
                <div 
                  className="absolute bg-slate-900 overflow-hidden shadow-2xl flex flex-col justify-end p-2 transition-all cursor-pointer group"
                  style={{
                    width: `${Math.min(parseInt(formData.floating_config[currentDev].width) || 90, 200)}px`,
                    height: `${Math.min(parseInt(formData.floating_config[currentDev].height) || 160, 320)}px`,
                    borderRadius: `${formData.floating_config[currentDev].border_radius}px`,
                    borderColor: formData.floating_config[currentDev].border_color,
                    borderWidth: `${formData.floating_config[currentDev].border_width}px`,
                    borderStyle: formData.floating_config[currentDev].border_style,
                    right: formData.floating_config[currentDev].position.includes('right') ? `${formData.floating_config[currentDev].margin_x}px` : 'auto',
                    left: formData.floating_config[currentDev].position.includes('left') ? `${formData.floating_config[currentDev].margin_x}px` : 'auto',
                    bottom: formData.floating_config[currentDev].position.includes('bottom') ? `${formData.floating_config[currentDev].margin_y}px` : 'auto',
                    top: formData.floating_config[currentDev].position.includes('top') ? `${formData.floating_config[currentDev].margin_y}px` : 'auto',
                  }}
                >
                  {formData.floating_config[currentDev].badge_show && (
                    <span 
                      className="absolute top-2 left-2 text-[9px] font-bold px-1.5 py-0.5 rounded shadow"
                      style={{ 
                        backgroundColor: formData.floating_config[currentDev].badge_bg, 
                        color: formData.floating_config[currentDev].badge_color 
                      }}
                    >
                      {formData.floating_config[currentDev].badge_text}
                    </span>
                  )}
                  <div className="w-full flex items-center justify-center my-auto text-white/40 group-hover:text-white transition">
                    <Play className="w-6 h-6 fill-current" />
                  </div>
                  {formData.floating_config[currentDev].cta_show && (
                    <div 
                      className="w-full py-1 text-center text-[10px] font-bold shadow"
                      style={{ 
                        backgroundColor: formData.floating_config[currentDev].cta_bg, 
                        color: formData.floating_config[currentDev].cta_color,
                        borderRadius: `${formData.floating_config[currentDev].cta_border_radius}px`
                      }}
                    >
                      {formData.floating_config[currentDev].cta_text}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CARROSSEL / DINÂMICO PREVIEW */}
            {(activeTab === 'carrossel' || activeTab === 'carrossel-dinamico') && (
              <div className="w-full max-w-[800px] bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-800 text-sm">Vídeos em Destaque</h4>
                  <span className="text-xs text-slate-400">Ver todos</span>
                </div>
                <div 
                  className="flex overflow-x-auto pb-4 pt-1" 
                  style={{ gap: `${(activeTab === 'carrossel' ? formData.carousel_config : formData.dynamic_carousel_config)[currentDev].spacing}px` }}
                >
                  {[1, 2, 3, 4, 5].slice(0, (activeTab === 'carrossel' ? formData.carousel_config : formData.dynamic_carousel_config)[currentDev].visible_items).map(item => (
                    <div
                      key={item}
                      className="shrink-0 bg-slate-900 relative overflow-hidden flex flex-col justify-end p-2.5 transition"
                      style={{
                        width: `${(activeTab === 'carrossel' ? formData.carousel_config : formData.dynamic_carousel_config)[currentDev].card_width}px`,
                        height: `${(activeTab === 'carrossel' ? formData.carousel_config : formData.dynamic_carousel_config)[currentDev].card_height}px`,
                        borderRadius: `${(activeTab === 'carrossel' ? formData.carousel_config : formData.dynamic_carousel_config)[currentDev].border_radius}px`,
                        borderColor: (activeTab === 'carrossel' ? formData.carousel_config : formData.dynamic_carousel_config)[currentDev].border_color,
                        borderWidth: `${(activeTab === 'carrossel' ? formData.carousel_config : formData.dynamic_carousel_config)[currentDev].border_width}px`,
                        borderStyle: (activeTab === 'carrossel' ? formData.carousel_config : formData.dynamic_carousel_config)[currentDev].border_style,
                      }}
                    >
                      <span className="absolute top-2 left-2 bg-[#fd8539] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                        VÍDEO #{item}
                      </span>
                      <div className="w-full flex items-center justify-center my-auto text-white/50">
                        <Play className="w-8 h-8 fill-current" />
                      </div>
                      <div 
                        className="w-full py-1.5 text-center text-[10px] font-bold shadow rounded-lg"
                        style={{ backgroundColor: formData.primary_color, color: '#ffffff' }}
                      >
                        Ver Produto
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* GRADE PREVIEW */}
            {activeTab === 'grade' && (
              <div className="w-full max-w-[700px] bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                <h4 className="font-bold text-slate-800 text-sm">Grade de Conteúdo</h4>
                <div 
                  className="grid"
                  style={{ 
                    gridTemplateColumns: `repeat(${formData.grid_config[currentDev].visible_items}, minmax(0, 1fr))`,
                    gap: `${formData.grid_config[currentDev].spacing}px`
                  }}
                >
                  {Array.from({ length: formData.grid_config[currentDev].visible_items * formData.grid_config[currentDev].rows }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-slate-900 aspect-9/16 rounded-xl flex items-center justify-center relative overflow-hidden"
                      style={{
                        borderColor: formData.grid_config[currentDev].border_color,
                        borderWidth: `${formData.grid_config[currentDev].border_width}px`,
                        borderRadius: `${formData.grid_config[currentDev].border_radius}px`,
                      }}
                    >
                      <Play className="w-5 h-5 text-white/40" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PLAYER PREVIEW */}
            {(activeTab === 'player' || activeTab === 'basico') && (
              <div 
                className="w-[280px] h-[500px] bg-slate-950 shadow-2xl relative flex flex-col justify-between p-4 overflow-hidden border border-slate-800"
                style={{ borderRadius: `${formData.modal_config.border_radius}px` }}
              >
                <div className="flex items-center justify-between text-white/80 z-10">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#0094eb] text-white flex items-center justify-center font-bold text-xs">
                      S
                    </div>
                    <span className="text-xs font-bold">Loja Demo</span>
                  </div>
                  <button className="p-1 rounded-full bg-black/40 text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="absolute inset-0 flex items-center justify-center text-white/20">
                  <Play className="w-16 h-16 fill-current" />
                </div>

                <div className="z-10 flex justify-between items-end">
                  <div className="space-y-1 text-white">
                    <h5 className="font-bold text-xs">Casaco Térmico Winter</h5>
                    <p className="text-[11px] font-bold text-emerald-400">R$ 189,90</p>
                  </div>
                  <div className="flex flex-col gap-3 text-white">
                    {formData.modal_config.like_button_show && (
                      <div className="flex flex-col items-center">
                        <Heart className="w-5 h-5" />
                        <span className="text-[9px]">1.2k</span>
                      </div>
                    )}
                    {formData.modal_config.comments_show && (
                      <div className="flex flex-col items-center">
                        <MessageSquare className="w-5 h-5" />
                        <span className="text-[9px]">48</span>
                      </div>
                    )}
                    {formData.modal_config.share_button_show && (
                      <div className="flex flex-col items-center">
                        <Share2 className="w-5 h-5" />
                        <span className="text-[9px]">Share</span>
                      </div>
                    )}
                  </div>
                </div>

                {formData.modal_config.cta_show && (
                  <button 
                    className="w-full py-2 text-xs font-bold shadow-lg z-10"
                    style={{ 
                      backgroundColor: formData.modal_config.cta_bg || formData.primary_color, 
                      color: formData.modal_config.cta_color || '#ffffff',
                      borderRadius: `${formData.modal_config.cta_border_radius}px`
                    }}
                  >
                    {formData.modal_config.cta_text || 'Comprar Agora'}
                  </button>
                )}
              </div>
            )}

          </div>
        </div>

        {/* FOOTER */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <button 
            type="button" 
            onClick={onClose} 
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
          >
            CANCELAR
          </button>
          <button 
            type="button" 
            disabled={isSaving} 
            onClick={handleSave} 
            className="flex items-center gap-2 px-6 py-2 bg-[#0094eb] hover:bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-[#0094eb]/20 transition disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {mode === 'create' ? 'SALVAR ESTILO' : 'ATUALIZAR ESTILO'}
          </button>
        </div>

      </div>
    </div>
  );
};