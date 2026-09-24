import { useStore } from '../../../contexts/StoreContext';
import React, { useState, useEffect } from 'react';
import { 
  X, Monitor, Smartphone, Link, Settings2, PlaySquare, 
  Layout, LayoutGrid, MonitorPlay, Save, CornerUpLeft, Star, ChevronDown
} from 'lucide-react';

interface AparenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleData?: any;
}

// Estilos padronizados do seu layout
const selectClass = "w-full py-2 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0094eb] focus:border-transparent dark:bg-slate-800 dark:text-white transition-shadow bg-white";
const inputClass = "w-full py-2 px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0094eb] focus:border-transparent dark:bg-slate-800 dark:text-white transition-shadow bg-white";

const FormField = ({ label, children }: any) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-bold text-slate-700 dark:text-slate-300">{label}</label>}
    {children}
  </div>
);

const ColorInput = ({ value, onChange }: any) => (
  <div className="flex items-center gap-2">
    <div className="relative w-10 h-10 shrink-0">
      <input 
        type="color" 
        value={value || '#0094eb'} 
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />
      <div 
        className="w-full h-full rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm pointer-events-none" 
        style={{ backgroundColor: value || '#0094eb' }}
      />
    </div>
    <input 
      type="text" 
      value={value || ''} 
      onChange={(e) => onChange(e.target.value)}
      className={`${inputClass} uppercase`}
      placeholder="#000000"
    />
  </div>
);

const CheckboxField = ({ label, checked, onChange }: any) => (
  <label className="flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-xl mb-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
    <input
      type="checkbox"
      checked={!!checked}
      onChange={(e) => onChange(e.target.checked)}
      className="w-4 h-4 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb]"
    />
    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
  </label>
);

const Accordion = ({ title, isOpen, onClick, children }: any) => (
  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800 mb-3 shadow-sm">
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
    >
      <span className="font-bold text-sm text-slate-800 dark:text-white">{title}</span>
      <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
    </button>
    {isOpen && (
      <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800/50">
        {children}
      </div>
    )}
  </div>
);

// Estrutura padrão inicial (fallback) para evitar erros de undefined
const defaultFormData = {
  floating_config: { desktop: {}, mobile: {} },
  carousel_config: { desktop: {}, mobile: {} },
  dynamic_carousel_config: { desktop: {}, mobile: {} },
  grid_config: { desktop: {}, mobile: {} },
  modal_config: {}
};

const AparenciaModal: React.FC<AparenciaModalProps> = ({ isOpen, onClose, styleData }) => {
  const [activeTab, setActiveTab] = useState('basico');
  const [isUnified, setIsUnified] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('mobile');
  // Inicia vazio para todos os accordions virem FECHADOS por padrão
  const [openAccordion, setOpenAccordion] = useState<string>('');
  const [styleName, setStyleName] = useState('Novo Estilo');
  const [isDefault, setIsDefault] = useState(true);
  const [formData, setFormData] = useState<any>(defaultFormData);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { currentStore } = useStore();
  const storeId = currentStore?.id;

  useEffect(() => {
    if (!isOpen || !storeId) return;
    const loadData = async () => {
      setIsLoading(true);
      try {
        const { VidlyticsDatabaseService } = await import('../../../services/VidlyticsDatabaseService');
        // Busca da vidlytics.vid_appearances
        const appearance = await VidlyticsDatabaseService.getAppearanceByStoreId(storeId);
        if (appearance) {
          setStyleName(appearance.name || 'Estilo Loja');
          setIsDefault(appearance.is_default || false);
          // O widget_style é o JSONB inteiro da configuração
          setFormData(appearance.widget_style ? { ...defaultFormData, ...appearance.widget_style } : defaultFormData);
        }
      } catch (error) {
        console.error("Erro ao carregar aparência:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isOpen, storeId]);

  // Função para saber em qual chave do JSON estamos mexendo baseado na Aba ativa
  const getTabKey = () => {
    if (activeTab === 'flutuante') return 'floating_config';
    if (activeTab === 'carrossel') return 'carousel_config';
    if (activeTab === 'carrossel-dinamico') return 'dynamic_carousel_config';
    if (activeTab === 'grade') return 'grid_config';
    if (activeTab === 'player') return 'modal_config';
    return null;
  };

  // Lê do formData considerando a aba e o dispositivo (exceto modal que é global)
  const getC = (key: string) => {
    const tabKey = getTabKey();
    if (!tabKey) return '';
    if (tabKey === 'modal_config') return formData[tabKey]?.[key];
    return formData[tabKey]?.[previewDevice]?.[key];
  };

  // Salva no formData mantendo a estrutura para o JSONB
  const setC = (key: string, value: any) => {
    const tabKey = getTabKey();
    if (!tabKey) return;

    setFormData((prev: any) => {
      // Modal Config não é separada por dispositivo no legado
      if (tabKey === 'modal_config') {
        return { ...prev, [tabKey]: { ...prev[tabKey], [key]: value } };
      }

      const updatedDevice = { ...(prev[tabKey]?.[previewDevice] || {}), [key]: value };

      // Se estiver unificado, espelha a mudança para o outro dispositivo
      if (isUnified) {
        const otherDevice = previewDevice === 'desktop' ? 'mobile' : 'desktop';
        return {
          ...prev,
          [tabKey]: {
            ...prev[tabKey],
            [previewDevice]: updatedDevice,
            [otherDevice]: updatedDevice, // Espelhamento
          }
        };
      }

      return {
        ...prev,
        [tabKey]: { ...prev[tabKey], [previewDevice]: updatedDevice }
      };
    });
  };

  const handleSave = async () => {
    if (!storeId) return;
    setIsSaving(true);
    try {
      const { VidlyticsDatabaseService } = await import('../../../services/VidlyticsDatabaseService');
      
      const payload = {
        name: styleName,
        is_default: isDefault,
        widget_style: formData // Salva na coluna JSONB
      };

      await VidlyticsDatabaseService.saveAppearance(storeId, payload);
      alert("Aparência salva com sucesso no banco SLL!");
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab('basico');
      setOpenAccordion(''); // Reseta sanfonas fechadas ao abrir modal
    }
  }, [isOpen]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== 'basico') setPreviewDevice('mobile');
    setOpenAccordion(''); // Reseta sanfonas fechadas ao trocar de aba
  };

  const toggleAccordion = (title: string) => setOpenAccordion(openAccordion === title ? '' : title);
  const closeModal = () => onClose();

  if (!isOpen) return null;

  const tabs = [
    { id: 'basico', label: 'Básico', icon: Settings2 },
    { id: 'flutuante', label: 'Flutuante', icon: PlaySquare },
    { id: 'carrossel', label: 'Carrossel', icon: Layout },
    { id: 'carrossel-dinamico', label: 'Carrossel Dinâmico', icon: Layout },
    { id: 'grade', label: 'Grade', icon: LayoutGrid },
    { id: 'player', label: 'Player', icon: MonitorPlay },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-[95vw] max-w-[1500px] h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Editar Estilo</h2>
          <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"><X size={24} /></button>
        </div>
        
        {/* NAVEGAÇÃO ABAS */}
        <div className="px-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap ${isActive ? 'bg-[#0094eb] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
              >
                <Icon size={16} /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* ESQUERDA - FORMULÁRIOS */}
          <div className="w-[450px] border-r border-slate-200 dark:border-slate-700 p-6 overflow-y-auto flex flex-col gap-4">
            
            {/* ABA BÁSICO */}
            {activeTab === 'basico' && (
              <>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Configurações Básicas</h3>
                <FormField label="Nome do Estilo">
                  <input
                    type="text"
                    value={styleName}
                    onChange={(e) => setStyleName(e.target.value)}
                    placeholder="Ex: Estilo Principal"
                    className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0094eb] bg-white dark:bg-slate-800 dark:text-white"
                  />
                </FormField>
                <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="mt-1"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb]" /></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">Definir como padrão</p>
                      <p className="text-xs text-slate-500 mt-1">Este modelo será aplicado automaticamente aos novos vídeos.</p>
                    </div>
                  </label>
                </div>
                <div className={`p-4 border rounded-xl transition-colors ${isUnified ? 'border-[#0094eb]/40 bg-[#0094eb]/5' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="mt-1"><input type="checkbox" checked={isUnified} onChange={(e) => setIsUnified(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb]" /></div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">Unificar Desktop/Mobile</p>
                      <p className="text-xs text-slate-500 mt-1">Alterações no Desktop espelham para o Mobile automaticamente nas abas a seguir.</p>
                    </div>
                  </label>
                </div>
              </>
            )}

            {/* DEMAIS ABAS: Controle de Dispositivo + Accordions */}
            {activeTab !== 'basico' && (
              <>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-2 capitalize">
                  {activeTab.replace('-', ' ')}
                </h3>

                {/* Switch Desktop/Mobile (Escondido se for o Player, pois o modal do legado é global) */}
                {activeTab !== 'player' && (
                  <div className="flex items-center justify-between p-4 mb-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Dispositivo</span>
                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                      <button onClick={() => !isUnified && setPreviewDevice('desktop')} className={`p-1.5 rounded-md transition-colors ${(isUnified || previewDevice === 'desktop') ? 'text-[#0094eb]' : 'text-slate-400'}`.concat('')}><Monitor size={16} strokeWidth={2.5} /></button>
                      {isUnified ? <Link size={14} className="text-[#0094eb] mx-1" strokeWidth={2.5} /> : <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>}
                      <button onClick={() => !isUnified && setPreviewDevice('mobile')} className={`p-1.5 rounded-md transition-colors ${(isUnified || previewDevice === 'mobile') ? 'text-[#0094eb]' : 'text-slate-400'}`.concat('')}><Smartphone size={16} strokeWidth={2.5} /></button>
                    </div>
                  </div>
                )}

                {/* ----------------- ABA FLUTUANTE ----------------- */}
                {activeTab === 'flutuante' && (
                  <>
                    <Accordion title="1. Formato & Dimensões" isOpen={openAccordion === '1'} onClick={() => toggleAccordion('1')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Formato (Shape)">
                          <select value={getC('shape') || 'portrait'} onChange={(e) => setC('shape', e.target.value)} className={selectClass}>
                            <option value="portrait">Retrato 9:16</option>
                            <option value="square">Quadrado 1:1</option>
                            <option value="landscape">Paisagem 16:9</option>
                            <option value="circle">Círculo</option>
                          </select>
                        </FormField>
                        <FormField label="Ajuste Imagem">
                          <select value={getC('object_fit') || 'cover'} onChange={(e) => setC('object_fit', e.target.value)} className={selectClass}>
                            <option value="cover">Preencher (Cover)</option>
                            <option value="contain">Conter (Contain)</option>
                          </select>
                        </FormField>
                        <FormField label="Largura (px)">
                          <input type="number" value={getC('width') || 80} onChange={(e) => setC('width', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Altura Calculada">
                          <input type="text" readOnly value={`${getC('shape') === 'landscape' ? Math.round((getC('width')||80)*9/16) : Math.round((getC('width')||80)*16/9)}px`} className={`${inputClass} bg-slate-50 cursor-not-allowed`} />
                        </FormField>
                      </div>
                    </Accordion>
                    <Accordion title="2. Posição & Margens" isOpen={openAccordion === '2'} onClick={() => toggleAccordion('2')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Posição">
                          <select value={getC('floating_position') || 'bottom-right'} onChange={(e) => setC('floating_position', e.target.value)} className={selectClass}>
                            <option value="bottom-left">Inferior Esquerda</option>
                            <option value="bottom-right">Inferior Direita</option>
                            <option value="top-left">Superior Esquerda</option>
                            <option value="top-right">Superior Direita</option>
                          </select>
                        </FormField>
                        <FormField label="Margem Inferior (px)">
                          <input type="number" value={getC('bottom_spacing') || 20} onChange={(e) => setC('bottom_spacing', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Margem Lateral (px)">
                          <input type="number" value={getC('right_spacing') || 20} onChange={(e) => setC('right_spacing', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Z-Index">
                          <input type="number" value={getC('z_index') || 9999} onChange={(e) => setC('z_index', e.target.value)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>
                    <Accordion title="3. Bordas" isOpen={openAccordion === '3'} onClick={() => toggleAccordion('3')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Cor da Borda">
                          <ColorInput value={getC('border_color')} onChange={(v: string) => setC('border_color', v)} />
                        </FormField>
                        <FormField label="Espessura (px)">
                          <input type="number" value={getC('border_style') || 2} onChange={(e) => setC('border_style', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Raio Borda (px)">
                          <input type="number" value={getC('border_radius') || 12} onChange={(e) => setC('border_radius', e.target.value)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>
                    <Accordion title="4. Elementos Visíveis" isOpen={openAccordion === '4'} onClick={() => toggleAccordion('4')}>
                      <div className="flex flex-col gap-2">
                        <CheckboxField label="Reproduzir automático (Mudo)" checked={getC('autoplay_videos') ?? true} onChange={(v: boolean) => setC('autoplay_videos', v)} />
                        <CheckboxField label="Exibir ícone de Play" checked={getC('show_play_icon') ?? true} onChange={(v: boolean) => setC('show_play_icon', v)} />
                        <CheckboxField label="Permitir fechar (X)" checked={getC('allow_close') ?? false} onChange={(v: boolean) => setC('allow_close', v)} />
                        <CheckboxField label="Exibir Call to Action (CTA)" checked={getC('show_cta') ?? false} onChange={(v: boolean) => setC('show_cta', v)} />
                      </div>
                      {getC('show_cta') && (
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
                          <FormField label="Texto CTA">
                            <input type="text" value={getC('cta_text') || 'VER VÍDEO'} onChange={(e) => setC('cta_text', e.target.value)} className={inputClass} />
                          </FormField>
                          <FormField label="Cor de Fundo CTA">
                            <ColorInput value={getC('cta_bg_color') || '#0094eb'} onChange={(v: string) => setC('cta_bg_color', v)} />
                          </FormField>
                        </div>
                      )}
                    </Accordion>
                  </>
                )}

                {/* ----------------- ABA CARROSSEL (NORMAL E DINÂMICO) ----------------- */}
                {(activeTab === 'carrossel' || activeTab === 'carrossel-dinamico') && (
                  <>
                    {activeTab === 'carrossel-dinamico' && (
                      <Accordion title="1. Ativação & Destaque" isOpen={openAccordion === '1'} onClick={() => toggleAccordion('1')}>
                        <div className="flex flex-col gap-2 mb-4">
                          <CheckboxField label="Ativar Carrossel Dinâmico" checked={getC('enabled') ?? true} onChange={(v: boolean) => setC('enabled', v)} />
                          <CheckboxField label="Destaque com Sombra" checked={getC('highlight_shadow') ?? false} onChange={(v: boolean) => setC('highlight_shadow', v)} />
                        </div>
                      </Accordion>
                    )}
                    <Accordion title="2. Formato & Dimensões" isOpen={openAccordion === '2'} onClick={() => toggleAccordion('2')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Formato">
                          <select value={getC('shape') || 'portrait'} onChange={(e) => setC('shape', e.target.value)} className={selectClass}>
                            <option value="portrait">Retrato 9:16</option>
                            <option value="square">Quadrado 1:1</option>
                            <option value="landscape">Paisagem 16:9</option>
                          </select>
                        </FormField>
                        <FormField label="Ajuste Imagem">
                          <select value={getC('object_fit') || 'cover'} onChange={(e) => setC('object_fit', e.target.value)} className={selectClass}>
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                          </select>
                        </FormField>
                        <FormField label="Largura Card (px)">
                          <input type="number" value={getC('width') || 80} onChange={(e) => setC('width', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Itens Visíveis">
                          <input type="number" value={getC('visible_items') || 4} onChange={(e) => setC('visible_items', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Espaçamento (Gap px)">
                          <input type="number" value={getC('spacing') || 16} onChange={(e) => setC('spacing', e.target.value)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>
                    <Accordion title="3. Margens" isOpen={openAccordion === '3'} onClick={() => toggleAccordion('3')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Margem Superior (px)">
                          <input type="number" value={getC('margin_top') || 0} onChange={(e) => setC('margin_top', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Margem Inferior (px)">
                          <input type="number" value={getC('margin_bottom') || 0} onChange={(e) => setC('margin_bottom', e.target.value)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>
                    <Accordion title="4. Bordas" isOpen={openAccordion === '4'} onClick={() => toggleAccordion('4')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Cor da Borda">
                          <ColorInput value={getC('border_color')} onChange={(v: string) => setC('border_color', v)} />
                        </FormField>
                        <FormField label="Espessura (px)">
                          <input type="number" value={getC('border_style') || 2} onChange={(e) => setC('border_style', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Raio Borda (px)">
                          <input type="number" value={getC('border_radius') || 12} onChange={(e) => setC('border_radius', e.target.value)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>
                    <Accordion title="5. Elementos Visíveis" isOpen={openAccordion === '5'} onClick={() => toggleAccordion('5')}>
                      <div className="flex flex-col gap-2">
                        <CheckboxField label="Exibir Título do Carrossel" checked={getC('show_title') ?? false} onChange={(v: boolean) => setC('show_title', v)} />
                        <CheckboxField label="Reproduzir automático (Mudo)" checked={getC('autoplay_videos') ?? true} onChange={(v: boolean) => setC('autoplay_videos', v)} />
                        <CheckboxField label="Exibir ícone de Play" checked={getC('show_play_icon') ?? true} onChange={(v: boolean) => setC('show_play_icon', v)} />
                        <CheckboxField label="Exibir Produto Vinculado" checked={getC('show_product') ?? true} onChange={(v: boolean) => setC('show_product', v)} />
                        <CheckboxField label="Auto Centralizar Clique" checked={getC('auto_center') ?? true} onChange={(v: boolean) => setC('auto_center', v)} />
                      </div>
                    </Accordion>
                  </>
                )}

                {/* ----------------- ABA GRADE ----------------- */}
                {activeTab === 'grade' && (
                  <>
                    <Accordion title="1. Formato & Layout" isOpen={openAccordion === '1'} onClick={() => toggleAccordion('1')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Formato">
                          <select value={getC('shape') || 'portrait'} onChange={(e) => setC('shape', e.target.value)} className={selectClass}>
                            <option value="portrait">Retrato</option>
                            <option value="square">Quadrado</option>
                            <option value="landscape">Paisagem</option>
                          </select>
                        </FormField>
                        <FormField label="Ajuste Imagem">
                          <select value={getC('object_fit') || 'cover'} onChange={(e) => setC('object_fit', e.target.value)} className={selectClass}>
                            <option value="cover">Cover</option>
                            <option value="contain">Contain</option>
                          </select>
                        </FormField>
                        <FormField label="Colunas Visíveis">
                          <input type="number" value={getC('visible_items') || 4} onChange={(e) => setC('visible_items', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Linhas Visíveis">
                          <input type="number" value={getC('rows') || 1} onChange={(e) => setC('rows', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Largura Card (px)">
                          <input type="number" value={getC('width') || 80} onChange={(e) => setC('width', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Espaçamento (Gap px)">
                          <input type="number" value={getC('spacing') || 16} onChange={(e) => setC('spacing', e.target.value)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>
                    <Accordion title="2. Bordas e Margens" isOpen={openAccordion === '2'} onClick={() => toggleAccordion('2')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Cor da Borda">
                          <ColorInput value={getC('border_color')} onChange={(v: string) => setC('border_color', v)} />
                        </FormField>
                        <FormField label="Espessura (px)">
                          <input type="number" value={getC('border_style') || 2} onChange={(e) => setC('border_style', e.target.value)} className={inputClass} />
                        </FormField>
                        <FormField label="Raio Borda (px)">
                          <input type="number" value={getC('border_radius') || 12} onChange={(e) => setC('border_radius', e.target.value)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>
                    <Accordion title="3. Elementos Visíveis" isOpen={openAccordion === '3'} onClick={() => toggleAccordion('3')}>
                      <div className="flex flex-col gap-2">
                        <CheckboxField label="Exibir Título da Grade" checked={getC('show_title') ?? false} onChange={(v: boolean) => setC('show_title', v)} />
                        <CheckboxField label="Reproduzir automático (Mudo)" checked={getC('autoplay_videos') ?? true} onChange={(v: boolean) => setC('autoplay_videos', v)} />
                        <CheckboxField label="Playback Sequencial (5s)" checked={getC('sequential_playback') ?? false} onChange={(v: boolean) => setC('sequential_playback', v)} />
                      </div>
                    </Accordion>
                  </>
                )}

                {/* ----------------- ABA PLAYER (MODAL) ----------------- */}
                {activeTab === 'player' && (
                  <>
                    <Accordion title="1. Estilo do Player" isOpen={openAccordion === '1'} onClick={() => toggleAccordion('1')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Cor de Destaque">
                          <ColorInput value={getC('border_color')} onChange={(v: string) => setC('border_color', v)} />
                        </FormField>
                        <FormField label="Raio Borda (px)">
                          <input type="number" value={getC('border_radius') || 12} onChange={(e) => setC('border_radius', e.target.value)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>
                    <Accordion title="2. Elementos Interativos" isOpen={openAccordion === '2'} onClick={() => toggleAccordion('2')}>
                      <div className="flex flex-col gap-2">
                        <CheckboxField label="Exibir Botão Fechar/Título" checked={getC('show_title') ?? true} onChange={(v: boolean) => setC('show_title', v)} />
                        <CheckboxField label="Exibir Botão Play/Pause" checked={getC('show_play_button') ?? true} onChange={(v: boolean) => setC('show_play_button', v)} />
                        <CheckboxField label="Exibir Card de Produto" checked={getC('show_product') ?? true} onChange={(v: boolean) => setC('show_product', v)} />
                        <CheckboxField label="Exibir Botão 'Comprar'" checked={getC('show_product_button') ?? true} onChange={(v: boolean) => setC('show_product_button', v)} />
                        <CheckboxField label="Exibir Botão Curtir (Like)" checked={getC('show_like_button') ?? true} onChange={(v: boolean) => setC('show_like_button', v)} />
                        <CheckboxField label="Exibir Botão Comentar" checked={getC('show_comment_button') ?? true} onChange={(v: boolean) => setC('show_comment_button', v)} />
                        <CheckboxField label="Exibir Botão Compartilhar" checked={getC('show_share_button') ?? true} onChange={(v: boolean) => setC('show_share_button', v)} />
                      </div>
                    </Accordion>
                  </>
                )}
              </>
            )}
          </div>
          
          {/* LADO DIREITO - ÁREA DE PREVIEW */}
          <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative h-full bg-slate-100 dark:bg-slate-900/50">
            {activeTab === 'basico' ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-600 p-10 w-full max-w-3xl flex flex-col items-center justify-center shadow-sm">
                {isDefault && (
                  <div className="inline-flex items-center gap-1.5 bg-[#e6f7ef] text-[#1a8c54] px-4 py-1.5 rounded-full text-[11px] font-black tracking-wide mb-8 uppercase">
                    <Star size={14} fill="currentColor" /> ESTILO PADRÃO DA LOJA
                  </div>
                )}
                <h2 className="text-4xl font-extrabold text-[#1a1f36] dark:text-white uppercase text-center">{styleName || 'Sem Nome'}</h2>
                <div className="mt-8 w-full max-w-2xl aspect-[9/16] bg-[#f0f0f0] dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400 font-bold">
                  Preview do Site
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center w-full h-full relative">
                {previewDevice === 'desktop' ? (
                  <div className="w-full max-w-5xl aspect-video bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden relative">
                    <div className="h-10 bg-slate-100 dark:bg-slate-900 flex items-center px-4"><div className="w-3 h-3 rounded-full bg-slate-400 mr-2"></div><div className="w-3 h-3 rounded-full bg-slate-400 mr-2"></div><div className="w-3 h-3 rounded-full bg-slate-400"></div></div>
                    <div className="flex-1 bg-slate-50 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                      <span className="font-bold text-lg mb-2 capitalize">Preview do {activeTab.replace('-', ' ')}</span>
                      <span className="text-sm">Desktop</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-[320px] h-[640px] rounded-[2rem] border-8 border-[#1a1f36] bg-white dark:bg-slate-800 relative shadow-2xl flex flex-col overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-5 bg-[#1a1f36] rounded-b-xl flex justify-center w-32 mx-auto z-10"></div>
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 relative">
                      <span className="font-bold text-lg mb-2 capitalize text-center px-4">Preview do {activeTab.replace('-', ' ')}</span>
                      <span className="text-sm">Mobile</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex justify-between items-center">
          <button className="bg-red-50 text-red-500 font-extrabold px-4 py-2 rounded-xl text-sm hover:bg-red-100 transition-colors" onClick={() => { if(confirm('Zerar todas as configurações?')) setFormData(defaultFormData); }}>
            RESETAR
          </button>
          <div className="hidden lg:flex items-center gap-2 text-slate-500 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full text-sm border border-slate-100 dark:border-slate-700">
            <CornerUpLeft size={16} className="text-[#0094eb]" />
            <span>Navegue pelas abas acima para configurar cada formato do widget no site.</span>
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition"><X size={18} strokeWidth={2.5} /> Cancelar</button>
            <button onClick={handleSave} disabled={isSaving || isLoading} className="flex items-center gap-2 px-4 py-2 bg-[#0094eb] hover:bg-[#007ec8] transition-colors text-white rounded-xl shadow-md font-bold text-sm disabled:opacity-50"><Save size={18} strokeWidth={2.5} /> {isSaving ? 'Salvando...' : 'Salvar Configurações'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AparenciaModal;
