import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Palette, 
  Plus, 
  Pencil, 
  Trash2, 
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
  Info,
  Check,
  Play,
  Loader2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
// TIPAGENS & INTERFACES (Extraídas do Legado)
// ─────────────────────────────────────────────────────────────
interface StyleItem {
  id: string;
  name: string;
  type: string;
  primaryColor: string;
  isDefault: boolean;
}

type TabType = 'basico' | 'flutuante' | 'carrossel' | 'carrossel-dinamico' | 'grade' | 'player';
type DeviceType = 'desktop' | 'mobile';
type WidgetShape = 'circle' | 'square' | 'portrait' | 'landscape' | 'rounded';
type FloatingPosition = 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
type PositionValue = 'fixed_bottom_right' | 'fixed_bottom_left' | 'fixed_top_right' | 'fixed_top_left';

type ResponsiveConfig<T> = {
  same_for_all: boolean;
  desktop: T;
  mobile: T;
};

type FloatingConfig = {
  shape: WidgetShape;
  width: string;
  height: string;
  border_radius: string;
  position: PositionValue;
  floating_position: FloatingPosition;
  bottom_spacing: string;
  top_spacing: string;
  left_spacing: string;
  right_spacing: string;
  border_color: string;
  border_style: string;
  show_play_icon: boolean;
  object_fit: string;
  draggable: boolean;
  allow_close: boolean;
  z_index: string;
  autoplay_videos: boolean;
  show_cta: boolean;
  cta_text: string;
  cta_bg_color: string;
  cta_text_color: string;
  cta_font_size: number;
  cta_is_bold: boolean;
};

type CarouselConfig = {
  spacing: number;
  shape: WidgetShape;
  view_mode: string;
  margin_top: string;
  margin_bottom: string;
  visible_items: number;
  show_product: boolean;
  show_play_icon: boolean;
  auto_center: boolean;
  width: string;
  border_color: string;
  border_style: string;
  border_radius: string;
  object_fit: string;
  show_title: boolean;
  autoplay_videos: boolean;
  auto_highlight: boolean;
  product_card_bg: string;
  product_card_border_color: string;
  product_card_border_width: string;
  product_card_border_radius: string;
  product_card_name_size: string;
  product_card_name_color: string;
  product_card_price_size: string;
  product_card_price_color: string;
  product_card_price_bold: boolean;
};

type DynamicCarouselConfig = Omit<
  CarouselConfig,
  'product_card_border_width' | 'product_card_border_radius' | 'product_card_name_size' | 'product_card_price_size'
> & {
  enabled: boolean;
  highlight_shadow: boolean;
  highlight_enlarge_active?: boolean;
  highlight_dim_inactive?: boolean;
  highlight_desaturate_inactive?: boolean;
  highlight_mode?: 'ring' | 'none';
  highlight_border_color?: string;
  margin_left?: string;
  margin_right?: string;
  product_card_border_width?: string;
  product_card_border_radius?: string;
  product_card_name_size?: string;
  product_card_price_size?: string;
  title_text?: string;
  title_font_size?: number;
  title_align?: 'left' | 'center' | 'right';
  title_bold?: boolean;
};

type GridConfig = {
  visible_items: number;
  margin_left?: string;
  margin_right?: string;
  margin_top?: string;
  margin_bottom?: string;
  rows: number;
  spacing: number;
  shape: WidgetShape;
  width: string;
  border_color: string;
  border_style: string;
  border_radius: string;
  object_fit: string;
  show_title: boolean;
  autoplay_videos: boolean;
  sequential_playback: boolean;
};

type ModalConfig = {
  show_title: boolean;
  show_play_button: boolean;
  show_product: boolean;
  show_product_button: boolean;
  show_like_button: boolean;
  show_comment_button: boolean;
  show_share_button: boolean;
  border_color: string;
  border_width: string;
  border_radius: string;
  product_card_bg?: string;
  product_card_border_color?: string;
  product_card_border_width?: string;
  product_card_border_radius?: string;
  product_card_name_size?: string;
  product_card_name_color?: string;
  product_card_price_size?: string;
  product_card_price_color?: string;
};

type ExtendedAppearance = {
  id: string;
  store_id: string;
  name: string;
  is_default: boolean;
  primary_color: string;
  secondary_color: string;
  text_color: string;
  background_color: string;
  button_color: string;
  font_family: string;
  widget_shape: WidgetShape;
  widget_size: string;
  widget_animation: string;
  useGlobalAppearance: boolean;
  use_global_appearance?: boolean;
  floating_config: ResponsiveConfig<FloatingConfig>;
  carousel_config: ResponsiveConfig<CarouselConfig>;
  dynamic_carousel_config: ResponsiveConfig<DynamicCarouselConfig>;
  grid_config: ResponsiveConfig<GridConfig>;
  modal_config: ModalConfig;
  created_at?: string;
  updated_at?: string;
};

// ─────────────────────────────────────────────────────────────
// DEFAULTS & UTILITÁRIOS
// ─────────────────────────────────────────────────────────────
const parseJsonIfNeeded = <T,>(value: unknown): T | null => {
  if (!value) return null;
  if (typeof value === 'object' && value !== null) return value as T;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }
  return null;
};

const createDefaultFloatingDesktopConfig = (): FloatingConfig => ({
  shape: 'portrait',
  width: '80',
  height: '142',
  border_radius: '12',
  position: 'fixed_bottom_right',
  floating_position: 'bottom-right',
  bottom_spacing: '20',
  top_spacing: '20',
  left_spacing: '20',
  right_spacing: '20',
  border_color: '#0094EB',
  border_style: '2',
  show_play_icon: true,
  object_fit: 'cover',
  draggable: false,
  allow_close: false,
  z_index: '2147483647',
  autoplay_videos: true,
  show_cta: false,
  cta_text: 'VER VÍDEO',
  cta_bg_color: '#0094EB',
  cta_text_color: '#FFFFFF',
  cta_font_size: 14,
  cta_is_bold: true,
});

const createDefaultFloatingMobileConfig = (): FloatingConfig => ({
  shape: 'portrait',
  width: '64',
  height: '114',
  border_radius: '12',
  position: 'fixed_bottom_right',
  floating_position: 'bottom-right',
  bottom_spacing: '16',
  top_spacing: '16',
  left_spacing: '16',
  right_spacing: '16',
  border_color: '#0094EB',
  border_style: '2',
  show_play_icon: true,
  object_fit: 'cover',
  draggable: false,
  allow_close: false,
  z_index: '2147483647',
  autoplay_videos: true,
  show_cta: false,
  cta_text: 'VER VÍDEO',
  cta_bg_color: '#0094EB',
  cta_text_color: '#FFFFFF',
  cta_font_size: 12,
  cta_is_bold: true,
});

const createDefaultCarouselDesktopConfig = (): CarouselConfig => ({
  spacing: 16,
  shape: 'portrait',
  view_mode: 'preview',
  margin_top: '0',
  margin_bottom: '0',
  visible_items: 4,
  show_product: true,
  show_play_icon: true,
  auto_center: true,
  width: '80',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '12',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '12',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
  product_card_price_bold: true,
  auto_highlight: false,
});

const createDefaultCarouselMobileConfig = (): CarouselConfig => ({
  spacing: 12,
  shape: 'portrait',
  view_mode: 'preview',
  margin_top: '0',
  margin_bottom: '0',
  visible_items: 2,
  show_product: true,
  show_play_icon: true,
  auto_center: true,
  width: '64',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '10',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '10',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
  product_card_price_bold: true,
  auto_highlight: false,
});

const createDefaultDynamicCarouselDesktopConfig = (): DynamicCarouselConfig => ({
  ...createDefaultCarouselDesktopConfig(),
  enabled: true,
  highlight_shadow: false,
  margin_left: '0',
  margin_right: '0',
});

const createDefaultDynamicCarouselMobileConfig = (): DynamicCarouselConfig => ({
  ...createDefaultCarouselMobileConfig(),
  enabled: true,
  highlight_shadow: false,
  margin_left: '0',
  margin_right: '0',
});

const createDefaultGridDesktopConfig = (): GridConfig => ({
  visible_items: 4,
  rows: 1,
  spacing: 16,
  shape: 'portrait',
  width: '80',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '12',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  sequential_playback: false,
  margin_left: '0',
  margin_right: '0',
  margin_top: '0',
  margin_bottom: '0',
});

const createDefaultGridMobileConfig = (): GridConfig => ({
  visible_items: 2,
  rows: 2,
  spacing: 12,
  shape: 'portrait',
  width: '64',
  border_color: '#0094EB',
  border_style: '2',
  border_radius: '10',
  object_fit: 'cover',
  show_title: false,
  autoplay_videos: true,
  sequential_playback: false,
  margin_left: '0',
  margin_right: '0',
  margin_top: '0',
  margin_bottom: '0',
});

const createDefaultModalConfig = (): ModalConfig => ({
  show_title: true,
  show_play_button: true,
  show_product: true,
  show_product_button: true,
  show_like_button: true,
  show_comment_button: true,
  show_share_button: true,
  border_color: '#0094EB',
  border_width: '2',
  border_radius: '12',
  product_card_bg: '#FFFFFF',
  product_card_border_color: '#E2E8F0',
  product_card_border_width: '1',
  product_card_border_radius: '12',
  product_card_name_size: '11',
  product_card_name_color: '#0F172A',
  product_card_price_size: '12',
  product_card_price_color: '#0094EB',
});

const createDefaultFormData = (storeId = ''): ExtendedAppearance => ({
  id: '',
  store_id: storeId,
  name: 'USEANNY',
  is_default: false,
  primary_color: '#0094EB',
  secondary_color: '#0094EB',
  text_color: '#0F172A',
  background_color: '#FFFFFF',
  button_color: '#0094EB',
  font_family: 'Inter, sans-serif',
  widget_shape: 'portrait',
  widget_size: 'medium',
  widget_animation: 'none',
  useGlobalAppearance: false,
  use_global_appearance: false,
  floating_config: {
    same_for_all: false,
    desktop: createDefaultFloatingDesktopConfig(),
    mobile: createDefaultFloatingMobileConfig(),
  },
  carousel_config: {
    same_for_all: false,
    desktop: createDefaultCarouselDesktopConfig(),
    mobile: createDefaultCarouselMobileConfig(),
  },
  dynamic_carousel_config: {
    same_for_all: false,
    desktop: createDefaultDynamicCarouselDesktopConfig(),
    mobile: createDefaultDynamicCarouselMobileConfig(),
  },
  grid_config: {
    same_for_all: false,
    desktop: createDefaultGridDesktopConfig(),
    mobile: createDefaultGridMobileConfig(),
  },
  modal_config: createDefaultModalConfig(),
});

const normalizeAppearance = (style: any, storeId = ''): ExtendedAppearance => {
  const defaults = createDefaultFormData(storeId);
  if (!style) return defaults;

  const isGlobal = Boolean(
    style.useGlobalAppearance ??
    style.use_global_appearance ??
    style.floating_config?.same_for_all ??
    defaults.useGlobalAppearance
  );

  return {
    ...defaults,
    ...style,
    id: style.id || '',
    store_id: style.store_id || storeId,
    name: style.name || 'Estilo sem nome',
    is_default: Boolean(style.is_default),
    primary_color: style.primary_color || defaults.primary_color,
    useGlobalAppearance: isGlobal,
    use_global_appearance: isGlobal,
    floating_config: {
      same_for_all: isGlobal,
      desktop: { ...defaults.floating_config.desktop, ...(parseJsonIfNeeded(style.floating_config)?.desktop || {}) },
      mobile: { ...defaults.floating_config.mobile, ...(parseJsonIfNeeded(style.floating_config)?.mobile || {}) },
    },
    carousel_config: {
      same_for_all: isGlobal,
      desktop: { ...defaults.carousel_config.desktop, ...(parseJsonIfNeeded(style.carousel_config)?.desktop || {}) },
      mobile: { ...defaults.carousel_config.mobile, ...(parseJsonIfNeeded(style.carousel_config)?.mobile || {}) },
    },
    dynamic_carousel_config: {
      same_for_all: isGlobal,
      desktop: { ...defaults.dynamic_carousel_config.desktop, ...(parseJsonIfNeeded(style.dynamic_carousel_config)?.desktop || {}) },
      mobile: { ...defaults.dynamic_carousel_config.mobile, ...(parseJsonIfNeeded(style.dynamic_carousel_config)?.mobile || {}) },
    },
    grid_config: {
      same_for_all: isGlobal,
      desktop: { ...defaults.grid_config.desktop, ...(parseJsonIfNeeded(style.grid_config)?.desktop || {}) },
      mobile: { ...defaults.grid_config.mobile, ...(parseJsonIfNeeded(style.grid_config)?.mobile || {}) },
    },
    modal_config: {
      ...defaults.modal_config,
      ...(parseJsonIfNeeded(style.modal_config) || {}),
    },
  };
};

export const AparenciaTab: React.FC = () => {
  // ─────────────────────────────────────────────────────────────
  // ESTADOS PRINCIPAIS & CONEXÃO DB
  // ─────────────────────────────────────────────────────────────
  const [storeId, setStoreId] = useState<string>('');
  const [rawAppearances, setRawAppearances] = useState<ExtendedAppearance[]>([]);
  const [stylesList, setStylesList] = useState<StyleItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Controle do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [activeTab, setActiveTab] = useState<TabType>('basico');
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Formulário do Estilo Selecionado
  const [formData, setFormData] = useState<ExtendedAppearance>(createDefaultFormData());
  const [styleName, setStyleName] = useState('USEANNY');
  const [isDefaultStyle, setIsDefaultStyle] = useState(true);
  const [syncAllDevices, setSyncAllDevices] = useState(false);

  // Controle de accordions abertos
  const [openAccordions, setOpenAccordions] = useState<{ [key: string]: boolean }>({
    '1': true,
    '2': false,
    '3': false,
    '4': false,
    '5': false
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // ─────────────────────────────────────────────────────────────
  // CARREGAR LOJA E ESTILOS DO SUPABASE
  // ─────────────────────────────────────────────────────────────
  const fetchStoreAndAppearances = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Tenta recuperar store_id do contexto ou localStorage
      let resolvedStoreId = 
        localStorage.getItem('sll_store_id') || 
        localStorage.getItem('selected_store_id') || 
        localStorage.getItem('store_id') || '';

      if (!resolvedStoreId) {
        const { data: storeData } = await supabase.from('stores').select('id').limit(1).single();
        if (storeData?.id) {
          resolvedStoreId = storeData.id;
        }
      }
      setStoreId(resolvedStoreId);

      // 2. Busca lista de aparências no schema vidlytics / public
      let query = supabase.from('appearances').select('*').order('created_at', { ascending: false });
      if (resolvedStoreId) {
        query = query.eq('store_id', resolvedStoreId);
      }
      const { data, error } = await query;

      if (error) {
        console.warn('Erro ao carregar aparências do Supabase:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const normalized = data.map((item: any) => normalizeAppearance(item, resolvedStoreId));
        setRawAppearances(normalized);
        setStylesList(
          normalized.map((item) => ({
            id: item.id,
            name: item.name || 'USEANNY',
            type: 'IDENTIDADE VISUAL',
            primaryColor: item.primary_color || '#0094EB',
            isDefault: item.is_default,
          }))
        );
      } else {
        // Fallback default caso a tabela esteja limpa
        const initial = createDefaultFormData(resolvedStoreId);
        initial.id = 'default-1';
        initial.name = 'USEANNY';
        initial.is_default = true;
        setRawAppearances([initial]);
        setStylesList([
          {
            id: initial.id,
            name: initial.name,
            type: 'IDENTIDADE VISUAL',
            primaryColor: initial.primary_color,
            isDefault: true,
          }
        ]);
      }
    } catch (err) {
      console.error('Falha ao processar aparências:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoreAndAppearances();
  }, [fetchStoreAndAppearances]);

  // ─────────────────────────────────────────────────────────────
  // HANDLERS DO MODAL (CRIAR / EDITAR / SALVAR / EXCLUIR / RESETAR)
  // ─────────────────────────────────────────────────────────────
  const handleOpenCreate = () => {
    const newForm = createDefaultFormData(storeId);
    newForm.name = '';
    newForm.is_default = stylesList.length === 0;
    setFormData(newForm);
    setStyleName('');
    setIsDefaultStyle(newForm.is_default);
    setSyncAllDevices(false);
    setModalMode('create');
    setActiveTab('basico');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: StyleItem) => {
    const found = rawAppearances.find((a) => a.id === item.id) || normalizeAppearance(item, storeId);
    setFormData(found);
    setStyleName(found.name);
    setIsDefaultStyle(found.is_default);
    setSyncAllDevices(found.useGlobalAppearance);
    setModalMode('edit');
    setActiveTab('basico');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSyncAllDevicesChange = (checked: boolean) => {
    setSyncAllDevices(checked);
    setFormData((prev) => ({
      ...prev,
      useGlobalAppearance: checked,
      use_global_appearance: checked,
      floating_config: { ...prev.floating_config, same_for_all: checked },
      carousel_config: { ...prev.carousel_config, same_for_all: checked },
      dynamic_carousel_config: { ...prev.dynamic_carousel_config, same_for_all: checked },
      grid_config: { ...prev.grid_config, same_for_all: checked },
    }));
  };

  const handleResetTab = () => {
    const defaults = createDefaultFormData(storeId);
    setFormData((prev) => {
      switch (activeTab) {
        case 'flutuante':
          return { ...prev, floating_config: defaults.floating_config };
        case 'carrossel':
          return { ...prev, carousel_config: defaults.carousel_config };
        case 'carrossel-dinamico':
          return { ...prev, dynamic_carousel_config: defaults.dynamic_carousel_config };
        case 'grade':
          return { ...prev, grid_config: defaults.grid_config };
        case 'player':
          return { ...prev, modal_config: defaults.modal_config };
        case 'basico':
        default:
          setStyleName('USEANNY');
          setIsDefaultStyle(false);
          setSyncAllDevices(false);
          return {
            ...prev,
            name: 'USEANNY',
            is_default: false,
            useGlobalAppearance: false,
            primary_color: '#0094EB',
          };
      }
    });
  };

  const handleDeleteStyle = async (id: string) => {
    if (!id || id.startsWith('default-')) {
      setStylesList((prev) => prev.filter((s) => s.id !== id));
      setRawAppearances((prev) => prev.filter((s) => s.id !== id));
      return;
    }

    if (!window.confirm('Tem certeza de que deseja excluir este estilo de aparência?')) return;

    try {
      const { error } = await supabase.from('appearances').delete().eq('id', id);
      if (error) throw error;
      await fetchStoreAndAppearances();
    } catch (err: any) {
      alert('Erro ao excluir estilo: ' + (err.message || 'Erro desconhecido'));
    }
  };

  const handleSaveModal = async () => {
    setIsSaving(true);
    try {
      const targetStoreId = storeId || formData.store_id;
      const finalName = styleName.trim() || 'Estilo Personalizado';

      // Se este estilo for marcado como padrão, desmarca os anteriores da mesma loja
      if (isDefaultStyle && targetStoreId) {
        await supabase
          .from('appearances')
          .update({ is_default: false })
          .eq('store_id', targetStoreId);
      }

      const payload: any = {
        store_id: targetStoreId || null,
        name: finalName,
        is_default: isDefaultStyle,
        primary_color: formData.primary_color || '#0094EB',
        secondary_color: formData.secondary_color || '#0094EB',
        text_color: formData.text_color || '#0F172A',
        background_color: formData.background_color || '#FFFFFF',
        button_color: formData.button_color || '#0094EB',
        font_family: formData.font_family || 'Inter, sans-serif',
        widget_shape: formData.widget_shape || 'portrait',
        widget_size: formData.widget_size || 'medium',
        widget_animation: formData.widget_animation || 'none',
        use_global_appearance: syncAllDevices,
        floating_config: formData.floating_config,
        carousel_config: formData.carousel_config,
        dynamic_carousel_config: formData.dynamic_carousel_config,
        grid_config: formData.grid_config,
        modal_config: formData.modal_config,
        updated_at: new Date().toISOString(),
      };

      if (modalMode === 'edit' && formData.id && !formData.id.startsWith('default-')) {
        payload.id = formData.id;
        const { error } = await supabase.from('appearances').update(payload).eq('id', formData.id);
        if (error) throw error;
      } else {
        payload.created_at = new Date().toISOString();
        const { error } = await supabase.from('appearances').insert([payload]);
        if (error) throw error;
      }

      await fetchStoreAndAppearances();
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Erro ao salvar aparência:', err);
      alert('Erro ao salvar estilo: ' + (err.message || 'Erro desconhecido'));
    } finally {
      setIsSaving(false);
    }
  };

  // Cor principal ativa para reflexo dinâmico no preview
  const activePrimaryColor = useMemo(() => {
    return formData.primary_color || '#0094EB';
  }, [formData.primary_color]);

  return (
    <div className="space-y-6">
      {/* 1. TOPO DA PÁGINA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Aparência</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Customize a identidade visual, widgets, carrosséis, grades e player da sua loja.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0094eb] hover:bg-blue-600 text-white rounded-xl text-xs font-bold tracking-wider uppercase transition-colors shadow-sm self-start sm:self-auto cursor-pointer"
        >
          <Plus size={16} />
          NOVO ESTILO
        </button>
      </div>

      {/* 2. CARD: ESTILOS CADASTRADOS */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
        {/* Header do Card */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0094eb] text-white flex items-center justify-center shadow-sm">
              <Palette size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base">Estilos Cadastrados</h3>
              <p className="text-xs text-slate-400">Templates e temas ativos configurados para a sua vitrine.</p>
            </div>
          </div>

          <span className="px-3 py-1 bg-blue-50 text-[#0094eb] rounded-full text-xs font-bold tracking-wider uppercase">
            {isLoading ? 'CARREGANDO...' : `${stylesList.length} ${stylesList.length === 1 ? 'TEMA' : 'TEMAS'}`}
          </span>
        </div>

        {/* Tabela de Estilos */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-2 w-[40%]">TEMPLATE</th>
                <th className="py-4 px-4 text-center w-[25%]">COR PRINCIPAL</th>
                <th className="py-4 px-4 text-center w-[20%]">STATUS</th>
                <th className="py-4 px-4 text-right w-[15%]">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm">
              {stylesList.map((style) => (
                <tr key={style.id} className="hover:bg-slate-50/60 transition-colors">
                  {/* Template */}
                  <td className="py-4 px-2">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg shrink-0 shadow-sm"
                        style={{ backgroundColor: style.primaryColor }}
                      />
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{style.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase mt-0.5">
                          {style.type}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Cor Principal */}
                  <td className="py-4 px-4 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                      <span 
                        className="w-2.5 h-2.5 rounded-full inline-block"
                        style={{ backgroundColor: style.primaryColor }}
                      />
                      <span className="text-xs font-bold text-slate-700">{style.primaryColor}</span>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="py-4 px-4 text-center">
                    {style.isDefault && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-[#0094eb] rounded-full text-[11px] font-bold tracking-wide">
                        ★ PADRÃO
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="py-4 px-4 text-right">
                    <div className="inline-flex items-center justify-end gap-2 text-slate-400">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(style)}
                        className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar Estilo"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStyle(style.id)}
                        className="p-1.5 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Excluir Estilo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL COMPLETO DE ESTILOS (NOVO / EDITAR) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white w-[96vw] max-w-[1550px] rounded-3xl shadow-2xl flex flex-col h-[93vh] overflow-hidden border border-slate-200">
            
            {/* Topo do Modal */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h3 className="text-base sm:text-lg font-bold text-slate-800">
                {modalMode === 'create' ? 'Criar Novo Estilo' : 'Editar Estilo'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Menu de Abas Superior do Modal */}
            <div className="px-6 pb-3">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('basico')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'basico'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <SlidersHorizontal size={13} />
                  Básico
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('flutuante')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'flutuante'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <PlaySquare size={13} />
                  Flutuante
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('carrossel')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'carrossel'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Columns size={13} />
                  Carrossel
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('carrossel-dinamico')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'carrossel-dinamico'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Sparkles size={13} />
                  Carrossel Dinâmico
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('grade')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'grade'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <LayoutGrid size={13} />
                  Grade
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('player')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    activeTab === 'player'
                      ? 'bg-[#0094eb] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Tv size={13} />
                  Player
                </button>
              </div>
            </div>

            {/* Conteúdo Central: Coluna Esquerda Enxuta (~30%) + Coluna Direita Ampla (~70%) */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden border-t border-slate-100">
              
              {/* COLUNA ESQUERDA: Formulários e Controles */}
              <div className="lg:col-span-4 xl:col-span-3 p-4 sm:p-5 overflow-y-auto border-r border-slate-100 bg-white space-y-4">
                
                {/* 1. ABA BÁSICO */}
                {activeTab === 'basico' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">Dados Básicos</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Defina o nome do estilo e o comportamento global entre Desktop e Mobile.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Nome do Estilo</label>
                      <input
                        type="text"
                        value={styleName}
                        onChange={(e) => {
                          setStyleName(e.target.value);
                          setFormData((prev) => ({ ...prev, name: e.target.value }));
                        }}
                        placeholder="Ex: Estilo padrão"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#0094eb]"
                      />
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs font-bold text-slate-700 mb-1.5">Definir como padrão</p>
                      <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={isDefaultStyle}
                          onChange={(e) => {
                            setIsDefaultStyle(e.target.checked);
                            setFormData((prev) => ({ ...prev, is_default: e.target.checked }));
                          }}
                          className="rounded text-[#0094eb] focus:ring-[#0094eb] w-4 h-4 cursor-pointer"
                        />
                        Definir como padrão da loja
                      </label>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-xs font-bold text-slate-700 mb-1">Usar aparência em todos os dispositivos</p>
                      <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-500 mt-1">
                        <input
                          type="checkbox"
                          checked={syncAllDevices}
                          onChange={(e) => handleSyncAllDevicesChange(e.target.checked)}
                          className="rounded text-[#0094eb] focus:ring-[#0094eb] w-4 h-4 mt-0.5 cursor-pointer"
                        />
                        <span>
                          Quando ativado, as configurações de Desktop serão aplicadas também no Mobile.
                        </span>
                      </label>
                    </div>
                  </div>
                )}

                {/* 2. DEMAIS ABAS */}
                {activeTab !== 'basico' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {activeTab === 'flutuante' && 'Configurações do Flutuante'}
                        {activeTab === 'carrossel' && 'Configurações do Carrossel'}
                        {activeTab === 'carrossel-dinamico' && 'Configurações do Carrossel Dinâmico'}
                        {activeTab === 'grade' && 'Configurações da Grade'}
                        {activeTab === 'player' && 'Configurações do Player'}
                      </h4>
                    </div>

                    {/* Acordeões de Customização */}
                    <div className="space-y-2">
                      <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleAccordion('1')}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer"
                        >
                          <span>
                            {activeTab === 'flutuante' && '1. Formato & Dimensões'}
                            {activeTab === 'player' && '1. Borda'}
                            {(activeTab === 'carrossel' || activeTab === 'carrossel-dinamico' || activeTab === 'grade') && '1. Layout & Dimensões'}
                          </span>
                          {openAccordions['1'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {openAccordions['1'] && (
                          <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                            <p>Altura, largura e espaçamentos do componente.</p>
                          </div>
                        )}
                      </div>

                      <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleAccordion('2')}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer"
                        >
                          <span>
                            {activeTab === 'flutuante' && '2. Posição & Margens'}
                            {activeTab === 'player' && '2. Cores & Gradientes'}
                            {(activeTab === 'carrossel' || activeTab === 'carrossel-dinamico' || activeTab === 'grade') && '2. Bordas'}
                          </span>
                          {openAccordions['2'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {openAccordions['2'] && (
                          <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                            <p>Configurações de bordas, espessuras e cantos arredondados.</p>
                          </div>
                        )}
                      </div>

                      <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleAccordion('3')}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer"
                        >
                          <span>
                            {activeTab === 'flutuante' && '3. Bordas'}
                            {(activeTab === 'player' || activeTab === 'carrossel' || activeTab === 'carrossel-dinamico' || activeTab === 'grade') && '3. Elementos Visíveis'}
                          </span>
                          {openAccordions['3'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {openAccordions['3'] && (
                          <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                            <p>Exibir/ocultar títulos, badges e ícones de visualização.</p>
                          </div>
                        )}
                      </div>

                      <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => toggleAccordion('4')}
                          className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer"
                        >
                          <span>
                            {activeTab === 'flutuante' && '4. Elementos Visíveis'}
                            {activeTab === 'carrossel-dinamico' && '4. Destaque de Vídeo'}
                            {(activeTab === 'player' || activeTab === 'carrossel' || activeTab === 'grade') && '4. Card de Produto'}
                          </span>
                          {openAccordions['4'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        {openAccordions['4'] && (
                          <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                            <p>Estilização do card de produto anexado ao vídeo.</p>
                          </div>
                        )}
                      </div>

                      {activeTab === 'carrossel-dinamico' && (
                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                          <button
                            type="button"
                            onClick={() => toggleAccordion('5')}
                            className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100/60 transition-colors cursor-pointer"
                          >
                            <span>5. Card de Produto</span>
                            {openAccordions['5'] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {openAccordions['5'] && (
                            <div className="p-3 bg-white border-t border-slate-100 text-xs text-slate-500 space-y-2">
                              <p>Configuração dos produtos destacados no carrossel dinâmico.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* COLUNA DIREITA: Área de Preview Ampla e Centralizada */}
              <div className="lg:col-span-8 xl:col-span-9 bg-slate-100/60 p-4 sm:p-6 flex flex-col items-center justify-center relative overflow-y-auto">
                
                {/* Switch de Dispositivo no Azul Padrão SLL */}
                <div className="absolute top-4 right-5 bg-white border border-slate-200/90 rounded-xl p-1 flex items-center gap-1 shadow-sm z-20">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      previewDevice === 'desktop' 
                        ? 'bg-[#0094eb] text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                    title="Visualizar Desktop"
                  >
                    <Monitor size={14} />
                    <span className="hidden sm:inline">Desktop</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      previewDevice === 'mobile' 
                        ? 'bg-[#0094eb] text-white shadow-xs' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                    }`}
                    title="Visualizar Mobile"
                  >
                    <Smartphone size={14} />
                    <span className="hidden sm:inline">Mobile</span>
                  </button>
                </div>

                {/* 1. VISUALIZAÇÃO: ABA BÁSICO */}
                {activeTab === 'basico' ? (
                  <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-8 sm:p-10 text-center shadow-sm my-auto">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">IDENTIFICAÇÃO</p>
                    <h3 className="text-2xl font-bold text-slate-800 mt-2 mb-8">
                      {styleName || 'Nome do Estilo'}
                    </h3>

                    {/* Diagrama Desktop <---> Mobile */}
                    <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 mb-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-14 h-11 border-2 border-slate-200 rounded-xl flex items-center justify-center bg-white shadow-xs">
                            <Monitor size={20} className="text-[#0094eb]" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 uppercase">DESKTOP</span>
                        </div>

                        <div className="flex flex-col items-center px-4">
                          <div className="border-t-2 border-dashed border-slate-300 w-20" />
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1.5">SEPARADOS</span>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-11 border-2 border-slate-200 rounded-xl flex items-center justify-center bg-white shadow-xs">
                            <Smartphone size={18} className="text-[#0094eb]" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-600 uppercase">MOBILE</span>
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      Configuração independente: Personalize aparências diferentes para Desktop e Mobile de forma isolada.
                    </p>
                  </div>
                ) : previewDevice === 'desktop' ? (
                  /* 2. VISUALIZAÇÃO DESKTOP: MOLDURA CLEAN DE MONITOR/BROWSER */
                  <div className="w-full max-w-3xl h-[560px] bg-white rounded-2xl border border-slate-200/90 shadow-xl flex flex-col overflow-hidden my-auto animate-in fade-in duration-200">
                    {/* Header do Navegador */}
                    <div className="h-9 bg-slate-100 border-b border-slate-200 flex items-center px-4 gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      </div>
                      <div className="mx-auto w-1/2 h-5 bg-white rounded-md border border-slate-200 flex items-center justify-center">
                        <span className="text-[10px] text-slate-400 font-medium">sualoja.com.br</span>
                      </div>
                    </div>

                    {/* Conteúdo interno da tela Desktop */}
                    <div className="flex-1 bg-slate-900 relative flex items-center justify-center p-6">
                      {/* Flutuante no Desktop */}
                      {activeTab === 'flutuante' && (
                        <div className="w-full h-full relative">
                          <div 
                            className="absolute bottom-6 right-6 w-28 h-44 rounded-2xl border-2 overflow-hidden shadow-2xl bg-slate-800 flex items-center justify-center"
                            style={{ borderColor: activePrimaryColor }}
                          >
                            <img
                              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md">
                                <Play size={12} fill="currentColor" className="ml-0.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Carrossel / Dinâmico no Desktop */}
                      {(activeTab === 'carrossel' || activeTab === 'carrossel-dinamico') && (
                        <div className="flex items-center gap-4 overflow-hidden px-4">
                          {[1, 2, 3, 4].map((item) => (
                            <div 
                              key={item} 
                              className="w-36 h-60 rounded-2xl border-2 overflow-hidden bg-slate-800 shrink-0 relative flex flex-col justify-between p-2 shadow-lg"
                              style={{ borderColor: activePrimaryColor }}
                            >
                              <img
                                src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                                alt="Story"
                                className="absolute inset-0 w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-md">
                                  <Play size={12} fill="currentColor" className="ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Grade no Desktop */}
                      {activeTab === 'grade' && (
                        <div className="grid grid-cols-4 gap-3 p-4 w-full">
                          {[1, 2, 3, 4].map((i) => (
                            <div 
                              key={i} 
                              className="h-44 rounded-xl overflow-hidden relative border bg-slate-800"
                              style={{ borderColor: activePrimaryColor }}
                            >
                              <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80" alt="Story" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-xs">
                                  <Play size={10} fill="currentColor" className="ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Player no Desktop */}
                      {activeTab === 'player' && (
                        <div 
                          className="w-72 h-[480px] rounded-2xl overflow-hidden relative border-2 shadow-2xl flex flex-col justify-between p-4"
                          style={{ borderColor: activePrimaryColor }}
                        >
                          <img
                            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80"
                            alt="Story Player"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70" />
                          <div className="relative z-10 pt-1">
                            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden mb-2">
                              <div className="w-2/3 h-full" style={{ backgroundColor: activePrimaryColor }} />
                            </div>
                            <div className="flex items-center justify-between text-white">
                              <span className="text-xs font-bold">Calça Confort</span>
                              <X size={14} className="cursor-pointer" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 3. VISUALIZAÇÃO MOBILE: MOCKUP SMARTPHONE MODERNO */
                  <div className="relative w-[310px] h-[580px] bg-slate-800/80 rounded-[44px] p-2 shadow-2xl border-[3px] border-slate-300/80 flex flex-col justify-between my-auto transition-all animate-in fade-in duration-200">
                    
                    {/* Câmera Frontal / Dynamic Island Sutil */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-950 rounded-full z-30 flex items-center justify-end px-2">
                      <div className="w-2 h-2 rounded-full bg-slate-800" />
                    </div>

                    {/* TELA INTERNA DO SMARTPHONE */}
                    <div className="w-full h-full bg-slate-900 rounded-[38px] overflow-hidden relative flex flex-col justify-center">

                      {/* --- PREVIEW: FLUTUANTE --- */}
                      {activeTab === 'flutuante' && (
                        <div className="w-full h-full relative p-4">
                          <div 
                            className="absolute bottom-6 right-5 w-20 h-32 rounded-2xl border-2 overflow-hidden shadow-2xl bg-slate-800 flex items-center justify-center group cursor-pointer"
                            style={{ borderColor: activePrimaryColor }}
                          >
                            <img
                              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <div className="w-7 h-7 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-md">
                                <Play size={11} fill="currentColor" className="ml-0.5" />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* --- PREVIEW: CARROSSEL --- */}
                      {activeTab === 'carrossel' && (
                        <div className="flex items-center gap-2.5 overflow-hidden px-2">
                          <div className="w-16 h-64 rounded-2xl bg-slate-800 opacity-40 shrink-0 overflow-hidden" />

                          {/* Card Central Destaque */}
                          <div 
                            className="w-48 h-80 rounded-3xl border-2 overflow-hidden bg-slate-800 shrink-0 relative flex flex-col justify-between p-2.5 shadow-2xl"
                            style={{ borderColor: activePrimaryColor }}
                          >
                            <img
                              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                              <div className="w-9 h-9 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-lg">
                                <Play size={14} fill="currentColor" className="ml-0.5" />
                              </div>
                            </div>
                            {/* Card de produto na base */}
                            <div className="relative z-10 mt-auto bg-white/95 backdrop-blur-xs rounded-xl p-2 shadow-md flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
                                <img
                                  src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=100&auto=format&fit=crop&q=80"
                                  alt="Produto"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">Calça Confort</p>
                                <p className="text-[10px] font-bold leading-tight" style={{ color: activePrimaryColor }}>R$ 149,95</p>
                              </div>
                            </div>
                          </div>

                          <div className="w-16 h-64 rounded-2xl bg-slate-800 opacity-40 shrink-0 overflow-hidden" />
                        </div>
                      )}

                      {/* --- PREVIEW: CARROSSEL DINÂMICO --- */}
                      {activeTab === 'carrossel-dinamico' && (
                        <div className="flex items-center justify-center gap-2 overflow-hidden px-2">
                          <div className="w-14 h-60 rounded-2xl bg-slate-800 opacity-30 shrink-0 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=200&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="w-full h-full object-cover"
                            />
                          </div>

                          <div 
                            className="w-48 h-80 rounded-3xl border-2 overflow-hidden bg-slate-800 shrink-0 relative flex flex-col justify-between p-2.5 shadow-2xl"
                            style={{ borderColor: activePrimaryColor }}
                          >
                            <img
                              src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                              <div className="w-9 h-9 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-lg">
                                <Play size={14} fill="currentColor" className="ml-0.5" />
                              </div>
                            </div>
                            <div className="relative z-10 mt-auto bg-white/95 backdrop-blur-xs rounded-xl p-2 shadow-md flex items-center gap-2">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 shrink-0 overflow-hidden">
                                <img
                                  src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=100&auto=format&fit=crop&q=80"
                                  alt="Produto"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[10px] font-bold text-slate-800 truncate leading-tight">Calça Confort</p>
                                <p className="text-[10px] font-bold leading-tight" style={{ color: activePrimaryColor }}>R$ 149,95</p>
                              </div>
                            </div>
                          </div>

                          <div className="w-14 h-60 rounded-2xl bg-slate-800 opacity-30 shrink-0 overflow-hidden">
                            <img
                              src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=80"
                              alt="Story"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      )}

                      {/* --- PREVIEW: GRADE --- */}
                      {activeTab === 'grade' && (
                        <div className="grid grid-cols-2 gap-2 p-3">
                          {[
                            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?w=200&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=200&auto=format&fit=crop&q=80',
                            'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=200&auto=format&fit=crop&q=80'
                          ].map((url, i) => (
                            <div 
                              key={i} 
                              className="h-32 rounded-2xl overflow-hidden relative border bg-slate-800 shadow-sm"
                              style={{ borderColor: activePrimaryColor }}
                            >
                              <img src={url} alt="Story" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                                <div className="w-6 h-6 rounded-full bg-white/95 text-slate-900 flex items-center justify-center shadow-xs">
                                  <Play size={9} fill="currentColor" className="ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* --- PREVIEW: PLAYER --- */}
                      {activeTab === 'player' && (
                        <div className="w-full h-full relative flex flex-col justify-between p-3.5 overflow-hidden">
                          <img
                            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80"
                            alt="Story Player"
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/75" />

                          {/* Topo do Player */}
                          <div className="relative z-10 pt-5">
                            <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden mb-2">
                              <div className="w-2/3 h-full" style={{ backgroundColor: activePrimaryColor }} />
                            </div>
                            <div className="flex items-center justify-between text-white">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full border border-white/60 bg-white/20" />
                                <div>
                                  <p className="text-[10px] font-bold leading-tight">Calça Confort</p>
                                  <p className="text-[8px] text-white/70 leading-tight">Vidlytics Store</p>
                                </div>
                              </div>
                              <button className="text-white/80 hover:text-white cursor-pointer">
                                <X size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Lateral Direita */}
                          <div className="relative z-10 self-end flex flex-col items-center gap-2.5 mb-2 text-white">
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
                                <Heart size={13} fill="white" />
                              </div>
                              <span className="text-[9px] font-bold mt-0.5">1.2k</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
                                <MessageSquare size={13} />
                              </div>
                              <span className="text-[9px] font-bold mt-0.5">48</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center">
                                <Share2 size={13} />
                              </div>
                              <span className="text-[8px] font-bold mt-0.5">Enviar</span>
                            </div>
                          </div>

                          {/* Base: Card de Produto */}
                          <div className="relative z-10 bg-white/95 backdrop-blur-xs rounded-xl p-2.5 shadow-lg flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                <img
                                  src="https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=100&auto=format&fit=crop&q=80"
                                  alt="Produto"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div>
                                <p className="text-[10px] font-bold text-slate-800 leading-tight">Calça Confort</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] font-bold" style={{ color: activePrimaryColor }}>R$ 149,95</span>
                                  <span className="text-[8px] text-slate-400 line-through">R$ 199,00</span>
                                </div>
                              </div>
                            </div>
                            <span className="text-slate-400 text-sm font-bold">›</span>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="px-6 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
              {/* Botão Resetar */}
              <button
                type="button"
                onClick={handleResetTab}
                className="text-[11px] font-bold tracking-wider uppercase text-rose-500 hover:bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100 transition-colors self-start sm:self-auto cursor-pointer"
              >
                RESETAR
              </button>

              {/* Aviso explicativo */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info size={13} className="text-[#0094eb] shrink-0" />
                <span>
                  Este painel é um <strong className="text-slate-600">preview meramente visual</strong>. Para testar cliques e interações, use o simulador na edição dos stories.
                </span>
              </div>

              {/* Botões Cancelar e Salvar */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                >
                  ✕ Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModal}
                  disabled={isSaving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#0094eb] hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      Salvar
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default AparenciaTab;