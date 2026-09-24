import React, { useState, useEffect } from 'react';
import { X, Monitor, Smartphone, Link as LinkIcon, Unlink, ChevronDown, ChevronUp } from 'lucide-react';
// Adapte o import do seu service conforme sua estrutura
// import { VidlyticsDatabaseService } from '../../services/VidlyticsDatabaseService';

interface AparenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeId: string;
}

const AparenciaModal = ({ isOpen, onClose, storeId }: AparenciaModalProps) => {
  const [activeTab, setActiveTab] = useState('basico');
  const [isDesktop, setIsDesktop] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | null>('layout');

  // Estado unificado espelhando o JSONB vid_appearances.widget_style
  const [config, setConfig] = useState({
    unifyDevices: false,
    desktop: {
      floating: {
        showCta: true,
        ctaText: 'VER VÍDEO',
        ctaFontSize: 14,
        ctaBold: true,
        ctaBgColor: '#0094EB',
        ctaTextColor: '#FFFFFF',
        playVideos: true,
      },
      carousel: { layoutType: 'default', borderRadius: 8, showTitle: true, showPrice: true },
      dynamic: {},
      grid: {},
      player: {}
    },
    mobile: {
      floating: {
        showCta: true,
        ctaText: 'VER VÍDEO',
        ctaFontSize: 12,
        ctaBold: true,
        ctaBgColor: '#0094EB',
        ctaTextColor: '#FFFFFF',
        playVideos: true,
      },
      carousel: { layoutType: 'default', borderRadius: 8, showTitle: true, showPrice: true },
      dynamic: {},
      grid: {},
      player: {}
    }
  });

  // Exemplo de carregamento inicial do banco (Descomente quando plugar o service)
  /*
  useEffect(() => {
    if (isOpen && storeId) {
      loadAppearance();
    }
  }, [isOpen, storeId]);

  const loadAppearance = async () => {
    setIsLoading(true);
    try {
      const data = await VidlyticsDatabaseService.getAppearance(storeId);
      if (data && data.widget_style) {
        setConfig(data.widget_style);
      }
    } catch (error) {
      console.error("Erro ao carregar aparência:", error);
    } finally {
      setIsLoading(false);
    }
  };
  */

  if (!isOpen) return null;

  // Função helper para atualizar configurações
  const updateConfig = (module: string, field: string, value: any) => {
    setConfig(prev => {
      const newConfig = { ...prev };
      const device = isDesktop ? 'desktop' : 'mobile';
      
      // Atualiza o device atual
      (newConfig[device] as any)[module][field] = value;

      // Se estiver unificado, replica para o outro device
      if (prev.unifyDevices) {
        const otherDevice = isDesktop ? 'mobile' : 'desktop';
        (newConfig[otherDevice] as any)[module][field] = value;
      }

      return newConfig;
    });
  };

  const toggleUnify = () => {
    setConfig(prev => {
      const newState = !prev.unifyDevices;
      const newConfig = { ...prev, unifyDevices: newState };
      
      // Se ativou unificação, copia do device atual para o outro
      if (newState) {
        const sourceDevice = isDesktop ? 'desktop' : 'mobile';
        const targetDevice = isDesktop ? 'mobile' : 'desktop';
        newConfig[targetDevice] = JSON.parse(JSON.stringify(newConfig[sourceDevice]));
      }
      return newConfig;
    });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // await VidlyticsDatabaseService.saveAppearance(storeId, config);
      console.log('Salvando no Supabase schema vidlytics:', config);
      setTimeout(() => {
        setIsLoading(false);
        onClose();
      }, 800);
    } catch (error) {
      console.error("Erro ao salvar", error);
      setIsLoading(false);
    }
  };

  const currentConfig = isDesktop ? config.desktop : config.mobile;

  // --- RENDERIZADORES DE ABAS ---

  const renderFlutuanteSettings = () => (
    <div className="space-y-4 animate-fadeIn">
      <div className="border border-slate-200 rounded-lg p-4">
        <label className="flex items-center space-x-3 cursor-pointer mb-4">
          <input 
            type="checkbox" 
            className="w-5 h-5 text-[#0094eb] rounded border-gray-300 focus:ring-[#0094eb]"
            checked={currentConfig.floating.showCta}
            onChange={(e) => updateConfig('floating', 'showCta', e.target.checked)}
          />
          <span className="font-medium text-slate-700">Exibir CTA (Pílula)</span>
        </label>

        {/* CONDICIONAL: Só mostra se showCta for true (Igual ao seu print) */}
        {currentConfig.floating.showCta && (
          <div className="pl-8 space-y-4 border-t border-slate-100 pt-4 mt-2">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Texto do CTA (máx 12 caract.)</label>
              <input 
                type="text" 
                maxLength={12}
                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0094eb]"
                value={currentConfig.floating.ctaText}
                onChange={(e) => updateConfig('floating', 'ctaText', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Tamanho da fonte (px)</label>
                <input 
                  type="number" 
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-[#0094eb]"
                  value={currentConfig.floating.ctaFontSize}
                  onChange={(e) => updateConfig('floating', 'ctaFontSize', Number(e.target.value))}
                />
              </div>
              <div className="flex items-center mt-6 border border-slate-200 rounded-md px-3">
                <label className="flex items-center space-x-2 cursor-pointer w-full py-2">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-[#0094eb] rounded border-gray-300"
                    checked={currentConfig.floating.ctaBold}
                    onChange={(e) => updateConfig('floating', 'ctaBold', e.target.checked)}
                  />
                  <span className="text-sm font-medium text-slate-600">Título em negrito</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cor de Fundo</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="color" 
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    value={currentConfig.floating.ctaBgColor}
                    onChange={(e) => updateConfig('floating', 'ctaBgColor', e.target.value)}
                  />
                  <input 
                    type="text" 
                    className="w-24 border border-slate-200 rounded-md px-2 py-1.5 text-sm uppercase"
                    value={currentConfig.floating.ctaBgColor}
                    onChange={(e) => updateConfig('floating', 'ctaBgColor', e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">Cor do Texto</label>
                <div className="flex items-center space-x-2">
                  <input 
                    type="color" 
                    className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                    value={currentConfig.floating.ctaTextColor}
                    onChange={(e) => updateConfig('floating', 'ctaTextColor', e.target.value)}
                  />
                  <input 
                    type="text" 
                    className="w-24 border border-slate-200 rounded-md px-2 py-1.5 text-sm uppercase"
                    value={currentConfig.floating.ctaTextColor}
                    onChange={(e) => updateConfig('floating', 'ctaTextColor', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border border-slate-200 rounded-lg p-4">
        <label className="flex items-center space-x-3 cursor-pointer">
          <input 
            type="checkbox" 
            className="w-5 h-5 text-[#0094eb] rounded border-gray-300"
            checked={currentConfig.floating.playVideos}
            onChange={(e) => updateConfig('floating', 'playVideos', e.target.checked)}
          />
          <span className="font-medium text-slate-700">Reproduzir vídeos automaticamente</span>
        </label>
      </div>
    </div>
  );

  const AccordionItem = ({ id, title, children }: any) => {
    const isActive = activeAccordion === id;
    return (
      <div className="border border-slate-200 rounded-lg mb-3 overflow-hidden">
        <button 
          onClick={() => setActiveAccordion(isActive ? null : id)}
          className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors"
        >
          <span className="font-semibold text-slate-700">{title}</span>
          {isActive ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </button>
        {isActive && <div className="p-4 border-t border-slate-100 bg-slate-50/50">{children}</div>}
      </div>
    );
  };

  const renderCarrosselSettings = () => (
    <div className="animate-fadeIn">
      <AccordionItem id="layout" title="1. Layout & Dimensões">
        <div className="text-sm text-slate-500">Configurações de espaçamento e formato do carrossel. (Exemplo)</div>
        {/* Adicione os inputs específicos do legado aqui */}
      </AccordionItem>
      
      <AccordionItem id="bordas" title="2. Bordas">
        <div className="text-sm text-slate-500">Configurações de arredondamento e cor da borda.</div>
      </AccordionItem>
      
      <AccordionItem id="visiveis" title="3. Elementos Visíveis">
        <div className="text-sm text-slate-500">Ocultar ou exibir setas, paginação, etc.</div>
      </AccordionItem>

      <AccordionItem id="card" title="4. Card de Produto">
        <div className="text-sm text-slate-500">Aparência do card de produto dentro do vídeo.</div>
      </AccordionItem>
    </div>
  );

  // --- PREVIEW DINÂMICO ---
  const renderPreview = () => {
    return (
      <div className={`relative w-full h-full bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 rounded-xl transition-all ${isDesktop ? 'p-8' : 'p-4'}`}>
        
        {/* Mock do Site */}
        <div className={`relative bg-white shadow-xl overflow-hidden flex flex-col ${isDesktop ? 'w-full h-[600px] rounded-lg' : 'w-[320px] h-[600px] rounded-[30px] border-[8px] border-slate-800'}`}>
          {/* Header Falso */}
          <div className="w-full h-12 bg-slate-100 border-b border-slate-200 flex items-center px-4">
            <div className="w-24 h-4 bg-slate-300 rounded"></div>
          </div>

          {/* Conteúdo Falso da Loja */}
          <div className="flex-1 p-6 space-y-4 opacity-40">
            <div className="w-3/4 h-8 bg-slate-200 rounded"></div>
            <div className="w-full h-32 bg-slate-200 rounded"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-24 bg-slate-200 rounded"></div>
              <div className="h-24 bg-slate-200 rounded"></div>
              <div className="h-24 bg-slate-200 rounded"></div>
            </div>
          </div>

          {/* WIDGETS REAIS (Baseados no estado) */}
          {activeTab === 'flutuante' && (
            <div className="absolute bottom-6 left-6 flex flex-col items-center gap-2 z-10 animate-bounce-slow">
              <div className="w-16 h-24 bg-slate-800 rounded-xl shadow-lg border-2 border-white overflow-hidden relative">
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-2 justify-center">
                    <div className="w-6 h-6 rounded-full bg-[#0094eb] flex items-center justify-center opacity-80">
                      <div className="w-0 h-0 border-t-4 border-t-transparent border-l-6 border-l-white border-b-4 border-b-transparent ml-1"></div>
                    </div>
                 </div>
              </div>
              {currentConfig.floating.showCta && (
                <div 
                  className="px-4 py-1.5 rounded-full shadow-md transition-all duration-300 whitespace-nowrap"
                  style={{ 
                    backgroundColor: currentConfig.floating.ctaBgColor,
                    color: currentConfig.floating.ctaTextColor,
                    fontSize: `${currentConfig.floating.ctaFontSize}px`,
                    fontWeight: currentConfig.floating.ctaBold ? 'bold' : 'normal'
                  }}
                >
                  {currentConfig.floating.ctaText || '...'}
                </div>
              )}
            </div>
          )}

          {activeTab === 'carrossel' && (
             <div className="absolute bottom-10 left-0 w-full px-4 z-10">
                <div className="flex gap-3 overflow-x-hidden">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-28 h-40 bg-slate-800 rounded-lg shadow-md border border-white shrink-0 relative">
                        <div className="absolute bottom-2 left-2 right-2 h-8 bg-white/90 rounded text-[10px] flex items-center justify-center font-bold text-slate-800">R$ 99,90</div>
                     </div>
                   ))}
                </div>
             </div>
          )}
          
          {(activeTab === 'dinamico' || activeTab === 'grade' || activeTab === 'player') && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 z-10 backdrop-blur-sm">
               <div className="bg-white p-4 rounded-lg shadow-lg text-sm font-medium text-slate-600 flex items-center gap-2">
                 <Monitor size={16} className="text-[#0094eb]" />
                 Preview {activeTab} em desenvolvimento...
               </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50 backdrop-blur-sm">
      <div className="w-[95%] max-w-[1400px] h-full bg-white shadow-2xl flex flex-col animate-slideInRight">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
          <h2 className="text-xl font-bold text-slate-800">Personalizar Aparência</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* MAIN CONTENT AREA */}
        <div className="flex flex-1 overflow-hidden">
          
          {/* LEFT PANEL - CONTROLS */}
          <div className="w-[450px] flex flex-col border-r border-slate-100 bg-white shadow-sm z-10">
            
            {/* TABS */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-slate-100 p-2 gap-1 bg-slate-50/50">
              {[
                { id: 'basico', label: 'Básico', icon: '⚙️' },
                { id: 'flutuante', label: 'Flutuante', icon: '📱' },
                { id: 'carrossel', label: 'Carrossel', icon: '🎠' },
                { id: 'dinamico', label: 'Dinâmico', icon: '⚡' },
                { id: 'grade', label: 'Grade', icon: '🔲' },
                { id: 'player', label: 'Player', icon: '▶️' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center px-4 py-2.5 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                    activeTab === tab.id 
                    ? 'bg-[#0094eb] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span> {tab.label}
                </button>
              ))}
            </div>

            {/* CONTROLE DE DISPOSITIVO (Sticky) */}
            {activeTab !== 'basico' && (
              <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-20">
                <div className="bg-slate-100 p-1 rounded-lg flex items-center justify-between relative">
                  <div className="flex space-x-1 w-full">
                    <button
                      onClick={() => setIsDesktop(true)}
                      className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-semibold transition-all ${
                        isDesktop ? 'bg-white text-[#0094eb] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Monitor size={16} className="mr-2" /> Desktop
                    </button>
                    <button
                      onClick={() => setIsDesktop(false)}
                      className={`flex-1 flex items-center justify-center py-2 rounded-md text-sm font-semibold transition-all ${
                        !isDesktop ? 'bg-white text-[#0094eb] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Smartphone size={16} className="mr-2" /> Mobile
                    </button>
                  </div>

                  {/* Botão Unificar */}
                  <button 
                    onClick={toggleUnify}
                    title={config.unifyDevices ? "Dispositivos unificados" : "Dispositivos separados"}
                    className={`absolute left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center shadow-md border-2 transition-colors ${
                      config.unifyDevices ? 'bg-[#0094eb] border-[#0094eb] text-white' : 'bg-white border-slate-200 text-slate-400 hover:text-[#0094eb]'
                    }`}
                  >
                    {config.unifyDevices ? <LinkIcon size={14} /> : <Unlink size={14} />}
                  </button>
                </div>
              </div>
            )}

            {/* SCROLLABLE SETTINGS AREA */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
              {activeTab === 'basico' && (
                <div className="text-slate-500 text-center py-10">Configurações globais da loja...</div>
              )}
              {activeTab === 'flutuante' && renderFlutuanteSettings()}
              {activeTab === 'carrossel' && renderCarrosselSettings()}
              {(activeTab === 'dinamico' || activeTab === 'grade' || activeTab === 'player') && (
                <div className="text-slate-500 text-center py-10">
                  Opções do {activeTab} em construção.
                </div>
              )}
            </div>

            {/* FOOTER SAVE */}
            <div className="p-4 border-t border-slate-100 bg-white">
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="w-full bg-[#fd8539] hover:bg-[#e6762f] text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  'Salvar Aparência'
                )}
              </button>
            </div>
          </div>

          {/* RIGHT PANEL - PREVIEW LIVE */}
          <div className="flex-1 bg-slate-50 p-6 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-700 flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                Preview em Tempo Real
              </h3>
              <div className="text-xs text-slate-400 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-100">
                Visualizando: {isDesktop ? 'Desktop' : 'Mobile'}
              </div>
            </div>
            {renderPreview()}
          </div>

        </div>
      </div>
    </div>
  );
};

export default AparenciaModal;
