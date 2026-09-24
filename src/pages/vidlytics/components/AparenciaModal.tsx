import React, { useState } from 'react';
import {
  X, Monitor, Smartphone, Link, Link2Off,
  Settings2, PlaySquare, Layout, LayoutGrid, MonitorPlay,
  Save, CornerUpLeft, Star, ChevronDown
} from 'lucide-react';

interface AparenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleName: string;
  setStyleName: (v: string) => void;
  isDefault: boolean;
  setIsDefault: (v: boolean) => void;
  isUnified: boolean;
  toggleUnified: (v: boolean) => void;
  formData: any;
  getConfig: (device: 'desktop' | 'mobile', key: string) => any;
  setConfig: (device: 'desktop' | 'mobile', key: string, value: any) => void;
  resetTab: (tabId: string, device: 'desktop' | 'mobile') => void;
  saveStyle: () => Promise<any>;
  isLoadingStyle: boolean;
  isSaving: boolean;
}

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
      checked={checked}
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

const AparenciaModal: React.FC<AparenciaModalProps> = ({
  isOpen, onClose,
  styleName, setStyleName,
  isDefault, setIsDefault,
  isUnified, toggleUnified,
  getConfig, setConfig,
  resetTab, saveStyle,
  isLoadingStyle, isSaving,
}) => {
  const [activeTab, setActiveTab] = useState('basico');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('mobile');
  const [openAccordion, setOpenAccordion] = useState<string>('1. Formato & Dimensões');

  const getC = (key: string) => getConfig(previewDevice, key);
  const setC = (key: string, value: any) => setConfig(previewDevice, key, value);

  const handleSave = async () => {
    try {
      await saveStyle();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      alert(error?.message || 'Erro ao salvar configurações.');
    }
  };

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== 'basico') setPreviewDevice('mobile');
    setOpenAccordion('1. Formato & Dimensões');
  };

  const toggleAccordion = (title: string) => {
    setOpenAccordion(openAccordion === title ? '' : title);
  };

  const handleReset = () => {
    if (activeTab === 'basico') return;
    resetTab(activeTab, previewDevice);
  };

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

        {/* HEADER MODAL */}
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">Editar Estilo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* TABS SUPERIORES */}
        <div className="px-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap
                    ${isActive ? 'bg-[#0094eb] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                >
                  <Icon size={16} /> {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab !== 'basico' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700">
              <button onClick={() => setPreviewDevice('desktop')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 text-[#0094eb] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Monitor size={16} /> Desktop</button>
              <button onClick={() => setPreviewDevice('mobile')} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 text-[#0094eb] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><Smartphone size={16} /> Mobile</button>
            </div>
          )}
        </div>

        {/* ÁREA CENTRAL */}
        <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-900/50">

          {/* ESQUERDA - CONTROLES */}
          <div className="w-[450px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-6 flex flex-col gap-4 shrink-0 custom-scrollbar">

            {isLoadingStyle ? (
              <div className="flex items-center justify-center h-full text-slate-400 font-bold">Carregando...</div>
            ) : activeTab === 'basico' ? (
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Configurações Básicas</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome do Estilo</label>
                    <input type="text" value={styleName} onChange={(e) => setStyleName(e.target.value)} placeholder="Ex: Minha Loja" className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0094eb] outline-none dark:bg-slate-800 dark:text-white font-medium" />
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="mt-1"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb]" /></div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">Definir como padrão</p>
                        <p className="text-xs text-slate-500 mt-1">Vídeos sem estilo definido usarão este modelo automaticamente.</p>
                      </div>
                    </label>
                  </div>
                  <div className={`p-4 border rounded-xl transition-colors ${isUnified ? 'border-[#0094eb]/40 bg-[#0094eb]/5' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="mt-1"><input type="checkbox" checked={isUnified} onChange={(e) => toggleUnified(e.target.checked)} className="w-5 h-5 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb]" /></div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">Unificar dispositivos</p>
                        <p className="text-xs text-slate-500 mt-1">As alterações que você fizer em Desktop serão aplicadas automaticamente ao Mobile.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-lg font-extrabold text-slate-800 dark:text-white mb-2 capitalize">
                  Configurações do {activeTab.replace('-', ' ')}
                </h3>

                <div className="flex items-center justify-between p-4 mb-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 shadow-sm">
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Dispositivo</span>
                  <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                    <button
                      onClick={() => !isUnified && setPreviewDevice('desktop')}
                      className={`p-1.5 rounded-md transition-colors ${(isUnified || previewDevice === 'desktop') ? 'text-[#0094eb]' : 'text-slate-400'} ${isUnified ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <Monitor size={16} strokeWidth={2.5} />
                    </button>
                    {isUnified ? <Link size={14} className="text-[#0094eb] mx-1" strokeWidth={2.5} /> : <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>}
                    <button
                      onClick={() => !isUnified && setPreviewDevice('mobile')}
                      className={`p-1.5 rounded-md transition-colors ${(isUnified || previewDevice === 'mobile') ? 'text-[#0094eb]' : 'text-slate-400'} ${isUnified ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <Smartphone size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {activeTab === 'flutuante' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

                    <Accordion title="1. Formato & Dimensões" isOpen={openAccordion === '1. Formato & Dimensões'} onClick={() => toggleAccordion('1. Formato & Dimensões')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Formato">
                          <select value={getC('floating_format') || 'portrait_9_16'} onChange={e => setC('floating_format', e.target.value)} className={selectClass}>
                            <option value="portrait_9_16">Retrato 9:16</option>
                            <option value="square_1_1">Quadrado 1:1</option>
                            <option value="landscape_16_9">Paisagem 16:9</option>
                            <option value="circle">Redondo (Stories)</option>
                          </select>
                        </FormField>
                        <FormField label="Ajuste Imagem">
                          <select value={getC('floating_object_fit') || 'cover'} onChange={e => setC('floating_object_fit', e.target.value)} className={selectClass}>
                            <option value="cover">Cover (Preencher)</option>
                            <option value="contain">Contain (Ajustar)</option>
                          </select>
                        </FormField>
                        <FormField label="Largura (px)">
                          <input type="number" min="40" max="200" value={getC('floating_width') || 80} onChange={e => setC('floating_width', parseInt(e.target.value) || 80)} className={inputClass} />
                        </FormField>
                        <FormField label="Altura Calculada">
                          <input type="text" readOnly value={`${Math.round((getC('floating_width') || 80) * 1.77)}px`} className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} />
                        </FormField>
                      </div>
                    </Accordion>

                    <Accordion title="2. Posição & Margens" isOpen={openAccordion === '2. Posição & Margens'} onClick={() => toggleAccordion('2. Posição & Margens')}>
                      <div className="mb-4">
                        <FormField label="Posição na Tela">
                          <select value={getC('floating_position') || 'bottom-right'} onChange={e => setC('floating_position', e.target.value)} className={selectClass}>
                            <option value="bottom-left">Inferior Esquerda</option>
                            <option value="bottom-right">Inferior Direita</option>
                            <option value="top-left">Superior Esquerda</option>
                            <option value="top-right">Superior Direita</option>
                          </select>
                        </FormField>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Margem Inferior (px)">
                          <input type="number" min="0" max="200" value={getC('floating_margin_bottom') || 20} onChange={e => setC('floating_margin_bottom', parseInt(e.target.value) || 0)} className={inputClass} />
                        </FormField>
                        <FormField label="Margem Superior (px)">
                          <input type="number" min="0" max="200" value={getC('floating_margin_top') || 20} onChange={e => setC('floating_margin_top', parseInt(e.target.value) || 0)} className={inputClass} />
                        </FormField>
                        <FormField label="Margem Lateral (px)">
                          <input type="number" min="0" max="200" value={getC('floating_margin_side') || 20} onChange={e => setC('floating_margin_side', parseInt(e.target.value) || 0)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>

                    <Accordion title="3. Bordas" isOpen={openAccordion === '3. Bordas'} onClick={() => toggleAccordion('3. Bordas')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Cor da Borda">
                          <ColorInput value={getC('floating_border_color') || '#0094EB'} onChange={(v: string) => setC('floating_border_color', v)} />
                        </FormField>
                        <FormField label="Largura Borda (px)">
                          <input type="number" min="0" max="10" value={getC('floating_border_width') || 2} onChange={e => setC('floating_border_width', parseInt(e.target.value) || 0)} className={inputClass} />
                        </FormField>
                        <FormField label="Raio da Borda (px)">
                          <input type="number" min="0" max="100" value={getC('floating_border_radius') || 12} onChange={e => setC('floating_border_radius', parseInt(e.target.value) || 0)} className={inputClass} />
                        </FormField>
                      </div>
                    </Accordion>

                    <Accordion title="4. Elementos Visíveis" isOpen={openAccordion === '4. Elementos Visíveis'} onClick={() => toggleAccordion('4. Elementos Visíveis')}>
                      <div className="flex flex-col">
                        <CheckboxField label="Exibir CTA (Pílula)" checked={getC('floating_show_cta') || false} onChange={(v: boolean) => setC('floating_show_cta', v)} />
                        <CheckboxField label="Reproduzir vídeos" checked={getC('floating_auto_play') !== false} onChange={(v: boolean) => setC('floating_auto_play', v)} />
                        <CheckboxField label="Exibir ícone de Play" checked={getC('floating_show_play_icon') !== false} onChange={(v: boolean) => setC('floating_show_play_icon', v)} />
                        <CheckboxField label="Exibir botão de fechar (X)" checked={getC('floating_show_close_button') || false} onChange={(v: boolean) => setC('floating_show_close_button', v)} />
                      </div>
                    </Accordion>
                  </div>
                )}

                {activeTab === 'carrossel' && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <Accordion title="1. Formato & Estilo" isOpen={openAccordion === '1. Formato & Estilo'} onClick={() => toggleAccordion('1. Formato & Estilo')}>
                      <div className="grid grid-cols-2 gap-4">
                        <FormField label="Estilo dos Itens">
                          <select value={getC('carousel_style') || 'stories'} onChange={e => setC('carousel_style', e.target.value)} className={selectClass}>
                            <option value="stories">Stories (Redondos)</option>
                            <option value="cards">Cards (Retangulares)</option>
                          </select>
                        </FormField>
                        <FormField label="Tamanho (px)">
                          <input type="number" min="40" max="200" value={getC('carousel_item_size') || 80} onChange={e => setC('carousel_item_size', parseInt(e.target.value) || 80)} className={inputClass} />
                        </FormField>
                        <FormField label="Espaçamento (Gap)">
                          <input type="number" min="0" max="50" value={getC('carousel_gap') || 12} onChange={e => setC('carousel_gap', parseInt(e.target.value) || 12)} className={inputClass} />
                        </FormField>
                        <FormField label="Cor da Borda">
                            <ColorInput value={getC('carousel_border_color') || '#0094EB'} onChange={(v: string) => setC('carousel_border_color', v)} />
                        </FormField>
                      </div>
                    </Accordion>

                    <Accordion title="2. Posição na Página" isOpen={openAccordion === '2. Posição na Página'} onClick={() => toggleAccordion('2. Posição na Página')}>
                      <div className="flex flex-col gap-4">
                        <FormField label="Posição Padrão">
                          <select value={getC('carousel_position') || 'top'} onChange={e => setC('carousel_position', e.target.value)} className={selectClass}>
                            <option value="top">Início da Página (Topo)</option>
                            <option value="bottom">Fim da Página (Rodapé)</option>
                            <option value="custom">Elemento Específico (Customizado)</option>
                          </select>
                        </FormField>
                        {getC('carousel_position') === 'custom' && (
                          <FormField label="Seletor HTML (Onde injetar?)">
                            <input type="text" placeholder="ex: #meu-carrossel" value={getC('carousel_custom_selector') || ''} onChange={e => setC('carousel_custom_selector', e.target.value)} className={inputClass} />
                          </FormField>
                        )}
                      </div>
                    </Accordion>
                  </div>
                )}

                {['carrossel-dinamico', 'grade', 'player'].includes(activeTab) && (
                   <div className="p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/30 flex flex-col items-center justify-center text-center mt-4">
                      <Settings2 size={40} strokeWidth={1.5} className="text-slate-400 mb-4" />
                      <p className="font-extrabold text-lg text-slate-700 dark:text-slate-300 mb-1">Controles em Desenvolvimento</p>
                      <p className="text-sm text-slate-500 max-w-xs">As opções de 1 a 4 para {activeTab.replace('-', ' ')} serão adicionadas nesta coluna.</p>
                   </div>
                )}
              </>
            )}
          </div>

          {/* DIREITA - ÁREA DE PREVIEW */}
          <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden h-full">

            {activeTab === 'basico' ? (
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-600 p-10 w-full max-w-3xl flex flex-col items-center justify-center shadow-sm">
                {isDefault && (
                  <div className="inline-flex items-center gap-1.5 bg-[#e6f7ef] text-[#1a8c54] px-4 py-1.5 rounded-full text-[11px] font-black tracking-wide mb-8 uppercase">
                    <Star size={14} fill="currentColor" /> ESTILO PADRÃO DA LOJA
                  </div>
                )}
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">IDENTIFICAÇÃO</p>
                <h2 className="text-4xl font-black text-[#1a1f36] dark:text-white mb-12 uppercase">{styleName || 'NOME DO ESTILO'}</h2>

                <div className="bg-[#f8f9fb] dark:bg-slate-800/50 rounded-2xl p-8 w-full max-w-xl flex items-center justify-between relative border border-slate-100 dark:border-slate-700 mb-8">
                  <div className="absolute top-[45%] left-24 right-24 h-0.5 bg-[#0094eb] z-0"></div>
                  <div className="flex flex-col items-center gap-4 z-10 bg-[#f8f9fb] dark:bg-slate-800 px-2">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#1a1f36] dark:text-white shadow-sm"><Monitor size={40} strokeWidth={1.5} /></div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">DESKTOP</span>
                  </div>
                  <div className="z-10 flex flex-col items-center gap-2 bg-[#f8f9fb] dark:bg-slate-800 px-2 mt-[-20px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border-2 shadow-sm ${isUnified ? 'border-[#0094eb] text-[#1a1f36]' : 'border-slate-300 text-slate-400'}`}>
                      {isUnified ? <Link size={18} strokeWidth={2.5} /> : <Link2Off size={18} strokeWidth={2.5} />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isUnified ? 'text-[#0094eb]' : 'text-slate-400'}`}>{isUnified ? 'UNIFICADOS' : 'SEPARADOS'}</span>
                  </div>
                  <div className="flex flex-col items-center gap-4 z-10 bg-[#f8f9fb] dark:bg-slate-800 px-2">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#1a1f36] dark:text-white shadow-sm"><Smartphone size={32} strokeWidth={1.5} /></div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">MOBILE</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500 font-medium text-center px-4 max-w-lg">
                  {isUnified ? 'Configuração unificada: As alterações que você fizer em Desktop serão aplicadas automaticamente ao Mobile.' : 'Configuração separada: Você terá que configurar a aparência do Desktop e do Mobile individualmente.'}
                </p>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {previewDevice === 'desktop' ? (
                  <div className="w-full max-w-5xl aspect-video bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                     <div className="h-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-2 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div><div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div><div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                     </div>
                     <div className="flex-1 relative bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                        <span className="z-10 text-slate-400 font-bold uppercase tracking-widest text-center px-4">Preview do {activeTab.replace('-', ' ')} (Desktop)</span>
                     </div>
                  </div>
                ) : (
                  <div className="h-full max-h-[800px] aspect-[9/19] rounded-[2.5rem] border-[10px] border-[#1a1f36] bg-slate-50 dark:bg-slate-900 shadow-2xl relative flex items-center justify-center overflow-hidden shrink-0">
                    <div className="absolute top-0 inset-x-0 h-5 bg-[#1a1f36] w-[40%] mx-auto rounded-b-xl z-20"></div>
                    <span className="z-10 text-slate-400 text-sm font-bold uppercase tracking-widest text-center px-4">Preview do {activeTab.replace('-', ' ')} (Mobile)</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          <button onClick={handleReset} className="bg-red-50 text-red-500 font-extrabold px-5 py-2.5 rounded-xl text-sm tracking-wide border border-transparent outline-none">
            RESETAR
          </button>
          <div className="hidden lg:flex items-center gap-2 text-slate-500 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full text-sm border border-slate-100 dark:border-slate-700 shadow-sm">
            <CornerUpLeft size={16} className="text-[#0094eb]" />
            <span>Este painel é um <strong>preview meramente visual</strong>. Para testar cliques e interações, use o simulador na edição dos stories.</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
              <X size={18} strokeWidth={2.5} /> Cancelar
            </button>
            <button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-[#0094eb] text-white rounded-xl text-sm font-bold shadow-md transition-none disabled:opacity-50">
              <Save size={18} strokeWidth={2.5} /> {isSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AparenciaModal;
