import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLoja } from '@/contexts/LojaContext';
import { VidlyticsDatabaseService, VidAppearanceRow } from '../../services/vidlytics/VidlyticsDatabaseService';
import { DEFAULT_APPEARANCES, getDefaultAppearanceById, isDefaultAppearance } from '../../data/defaultAppearances';

// ─────────────── Defaults (equivalentes ao legado, em chaves flat por device) ───────────────

const createDefaultDeviceConfig = () => ({
  // Flutuante
  floating_format: 'portrait_9_16',
  floating_object_fit: 'cover',
  floating_width: 80,
  floating_position: 'bottom-right',
  floating_margin_bottom: 20,
  floating_margin_top: 20,
  floating_margin_side: 20,
  floating_border_color: '#0094EB',
  floating_border_width: 2,
  floating_border_radius: 12,
  floating_show_cta: false,
  floating_auto_play: true,
  floating_show_play_icon: true,
  floating_show_close_button: false,

  // Carrossel
  carousel_style: 'stories',
  carousel_item_size: 80,
  carousel_gap: 12,
  carousel_border_color: '#0094EB',
  carousel_position: 'top',
  carousel_custom_selector: '',

  // Carrossel Dinâmico (placeholder de estrutura, mesma base do carrossel)
  dynamic_carousel_item_size: 80,
  dynamic_carousel_gap: 8,
  dynamic_carousel_border_color: '#0094EB',
  dynamic_carousel_highlight_shadow: false,
  dynamic_carousel_highlight_enlarge_active: false,
  dynamic_carousel_highlight_desaturate_inactive: false,

  // Grade
  grid_columns: 2,
  grid_gap: 12,
  grid_border_color: '#0094EB',
  grid_border_radius: 12,
  grid_show_title: false,

  // Player/Modal
  modal_border_color: '#0094EB',
  modal_border_width: 2,
  modal_border_radius: 12,
  modal_show_title: true,
  modal_show_like_button: true,
  modal_show_comment_button: true,
  modal_show_share_button: true,
  modal_show_product: true,
});

const createDefaultWidgetStyle = () => ({
  desktop: createDefaultDeviceConfig(),
  mobile: createDefaultDeviceConfig(),
});

// ─────────────── Hook principal ───────────────

export function useAppearanceLogic() {
  const storeContext = useLoja();
  const currentStore = storeContext?.store;
  const rawStoreId = currentStore?.id || localStorage.getItem('sll_store_id') || undefined;
  const isValidUUID = (value: string | undefined): value is string => {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  };
  const storeId = isValidUUID(rawStoreId) ? rawStoreId : undefined;
  // Estado da LISTA (para AparenciaTab.tsx)
  const [appearances, setAppearances] = useState<VidAppearanceRow[]>([]);
  const [listLoading, setListLoading] = useState(true);

  // Estado do MODAL (para AparenciaModal.tsx)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [styleName, setStyleName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isUnified, setIsUnified] = useState(true);
  const [formData, setFormData] = useState<any>(createDefaultWidgetStyle());
  const [isLoadingStyle, setIsLoadingStyle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Lista de templates (estilos padrões) + lista de estilos customizados
  const defaultAppearances = useMemo(() => DEFAULT_APPEARANCES.map((d) => ({ ...d, is_default: false })), []);
  const customAppearances = useMemo(() => appearances, [appearances]);

  // ─────────── Carregar lista de estilos da loja ───────────
  const loadAppearances = useCallback(async () => {
    if (!storeId) return;
    setListLoading(true);
    try {
      const data = await VidlyticsDatabaseService.getAppearances(storeId);
      setAppearances(data);
    } catch (error) {
      console.error('Erro ao carregar estilos:', error);
    } finally {
      setListLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    loadAppearances();
  }, [loadAppearances]);

  // Atualiza lista quando um estilo é salvo no modal
  useEffect(() => {
    const handleSaved = () => loadAppearances();
    window.addEventListener('vidlytics:appearance_saved', handleSaved);
    return () => window.removeEventListener('vidlytics:appearance_saved', handleSaved);
  }, [loadAppearances]);

  // ─────────── Abrir modal: novo estilo ───────────
  const openNewStyle = useCallback(() => {
    setEditingId(null);
    setStyleName('');
    setIsDefault(appearances.length === 0); // primeiro estilo já nasce padrão
    setIsUnified(true);
    setFormData(createDefaultWidgetStyle());
    setIsModalOpen(true);
  }, [appearances.length]);

  // ─────────── Abrir modal: editar estilo existente ou visualizar template ───────────
  const openEditStyle = useCallback(async (id: string) => {
    setEditingId(id);
    setIsModalOpen(true);
    setIsLoadingStyle(true);
    try {
      if (isDefaultAppearance(id)) {
        // Template padrão: abre em modo "salvar como"
        const template = getDefaultAppearanceById(id);
        if (template) {
          setStyleName(`${template.name} (Cópia)`);
          setIsDefault(false);
          setFormData(template.widget_style);
          const unified = JSON.stringify(template.widget_style.desktop) === JSON.stringify(template.widget_style.mobile);
          setIsUnified(unified);
        }
        return;
      }
      const style = await VidlyticsDatabaseService.getAppearanceById(id);
      if (style) {
        setStyleName(style.name);
        setIsDefault(style.is_default);
        const widgetStyle = style.widget_style || createDefaultWidgetStyle();
        setFormData(widgetStyle);
        // Detecta se desktop/mobile são idênticos para restaurar o toggle "unificar"
        const unified = JSON.stringify(widgetStyle.desktop) === JSON.stringify(widgetStyle.mobile);
        setIsUnified(unified);
      }
    } catch (error) {
      console.error('Erro ao carregar estilo:', error);
    } finally {
      setIsLoadingStyle(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingId(null);
  }, []);

  // ─────────── Get/Set de campo, respeitando o modo unificado ───────────
  const getConfig = useCallback(
    (device: 'desktop' | 'mobile', key: string) => formData?.[device]?.[key],
    [formData],
  );

  const setConfig = useCallback(
    (device: 'desktop' | 'mobile', key: string, value: any) => {
      setFormData((prev: any) => {
        if (isUnified) {
          // Espelha a alteração em ambos os devices
          return {
            ...prev,
            desktop: { ...prev.desktop, [key]: value },
            mobile: { ...prev.mobile, [key]: value },
          };
        }
        return {
          ...prev,
          [device]: { ...prev[device], [key]: value },
        };
      });
    },
    [isUnified],
  );

  // Ao ativar "unificar", desktop passa a ser a fonte da verdade para mobile
  const toggleUnified = useCallback((checked: boolean) => {
    setIsUnified(checked);
    if (checked) {
      setFormData((prev: any) => ({
        ...prev,
        mobile: { ...prev.desktop },
      }));
    }
  }, []);

  // ─────────── Reset da aba ativa (usado pelo botão "Resetar") ───────────
  const resetTab = useCallback((tabId: string, device: 'desktop' | 'mobile') => {
    const defaults = createDefaultDeviceConfig();
    const prefixMap: Record<string, string> = {
      flutuante: 'floating_',
      carrossel: 'carousel_',
      'carrossel-dinamico': 'dynamic_carousel_',
      grade: 'grid_',
      player: 'modal_',
    };
    const prefix = prefixMap[tabId];
    if (!prefix) return;

    setFormData((prev: any) => {
      const resetKeys: Record<string, any> = {};
      Object.keys(defaults).forEach((key) => {
        if (key.startsWith(prefix)) resetKeys[key] = (defaults as any)[key];
      });

      if (isUnified) {
        return {
          ...prev,
          desktop: { ...prev.desktop, ...resetKeys },
          mobile: { ...prev.mobile, ...resetKeys },
        };
      }
      return {
        ...prev,
        [device]: { ...prev[device], ...resetKeys },
      };
    });
  }, [isUnified]);

  // ─────────── Salvar (criar ou atualizar). Sempre cria novo se for template. ───────────
  const saveStyle = useCallback(async () => {
    if (!storeId) return;
    if (!styleName.trim()) {
      throw new Error('Nome do estilo é obrigatório.');
    }
    setIsSaving(true);
    try {
      const widgetStyleToSave = isUnified
        ? { desktop: formData.desktop, mobile: { ...formData.desktop } }
        : formData;

      // Se estava editando um template, salva como novo estilo
      const isTemplateEdit = isDefaultAppearance(editingId);

      const saved = await VidlyticsDatabaseService.saveAppearance(
        storeId,
        {
          id: isTemplateEdit ? undefined : editingId || undefined,
          name: styleName.trim(),
          is_default: isDefault,
          widget_style: widgetStyleToSave,
        },
      );

      await loadAppearances();
      closeModal();
      return saved;
    } finally {
      setIsSaving(false);
    }
  }, [storeId, styleName, isDefault, isUnified, formData, editingId, loadAppearances, closeModal]);

  // ─────────── Excluir ───────────
  const deleteStyle = useCallback(async (id: string) => {
    if (!storeId) return;
    await VidlyticsDatabaseService.deleteAppearance(storeId, id);
    await loadAppearances();
  }, [storeId, loadAppearances]);

  // ─────────── Definir como padrão (a partir da tabela) ───────────
  const setAsDefault = useCallback(async (id: string) => {
    if (!storeId) return;
    await VidlyticsDatabaseService.setDefaultAppearance(storeId, id);
    await loadAppearances();
  }, [storeId, loadAppearances]);

  return {
    // Lista (AparenciaTab)
    appearances,
    customAppearances,
    defaultAppearances,
    listLoading,
    loadAppearances,
    deleteStyle,
    setAsDefault,

    // Modal (AparenciaModal)
    isModalOpen,
    openNewStyle,
    openEditStyle,
    closeModal,
    styleName,
    setStyleName,
    isDefault,
    setIsDefault,
    isUnified,
    toggleUnified,
    formData,
    getConfig,
    setConfig,
    resetTab,
    saveStyle,
    isLoadingStyle,
    isSaving,
    editingId,
    isDefaultEditing: isDefaultAppearance(editingId),
  };
}
