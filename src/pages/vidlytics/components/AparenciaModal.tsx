import React, { useState, useEffect } from 'react';
import { 
  X, Monitor, Smartphone, Link, Link2Off, 
  Settings2, PlaySquare, Layout, LayoutGrid, MonitorPlay,
  ChevronDown, Save, CornerUpLeft, Star
} from 'lucide-react';

interface AparenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleData?: any;
}

const AparenciaModal: React.FC<AparenciaModalProps> = ({ isOpen, onClose, styleData }) => {
    const [carouselDevice, setCarouselDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [floatingDevice, setFloatingDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [activeTab, setActiveTab] = useState('basico');
  const [isUnified, setIsUnified] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('mobile');
  const [styleName, setStyleName] = useState('USEANNY');
  const [isDefault, setIsDefault] = useState(true);
    const [openAccordion, setOpenAccordion] = useState<string | null>(null);

  // --- INTEGRAÇÃO COM BANCO DE DADOS E ESTADO GERAL ---
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // ESTADO PRINCIPAL (Acaba com o erro "formData is not defined")
  const [formData, setFormData] = useState<any>({
    desktop: {},
    mobile: {}
  });

  // TODO: Pegar o storeId real do contexto de Autenticação do SLL Hub
  const storeId = "USER_STORE_ID_AQUI"; 

  // Carrega do Banco ao abrir o modal
  useEffect(() => {
    if (!isOpen) return;
    
    const loadData = async () => {
      setIsLoading(true);
      try {
        // Import dinâmico para evitar erro caso o arquivo ainda não esteja linkado
        const { VidlyticsDatabaseService } = await import('../../../services/VidlyticsDatabaseService');
        const style = await VidlyticsDatabaseService.getAppearanceByStoreId(storeId);
        
        if (style) {
          setFormData(style);
        }
      } catch (error) {
        console.error("Erro ao carregar aparência:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [isOpen]);

  const getConfig = (device: 'desktop' | 'mobile', key: string) => {
    return formData[device]?.[key] || '';
  };

  const setConfig = (device: 'desktop' | 'mobile', key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [device]: {
        ...prev[device] || {},
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { VidlyticsDatabaseService } = await import('../../../services/VidlyticsDatabaseService');
      await VidlyticsDatabaseService.saveAppearance(storeId, formData);
      alert("Aparência salva com sucesso no banco SLL!"); // Feedback visual simples
      onClose();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };
  // ---------------------------------------------------

  

  // 1. Garante que sempre abre na aba 'basico'
  useEffect(() => {
    if (isOpen) {
      setActiveTab('basico');
    }
  }, [isOpen]);

  // 2. Garante que ao mudar de aba (saindo do básico), o preview seja mobile
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== 'basico') {
      setPreviewDevice('mobile');
    }
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
          <h2 className="text-xl font-extrabold text-slate-800 dark:text-white">
            {styleData ? 'Editar Estilo' : 'Editar Estilo'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* TABS SUPERIORES & TOGGLE DE VISUALIZAÇÃO */}
        <div className="px-6 pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          
          {/* Abas Esquerda */}
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors whitespace-nowrap
                    ${isActive 
                      ? 'bg-[#0094eb] text-white shadow-sm' 
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* 3. Toggle de Dispositivo (Canto Direito) - Aparece apenas fora do 'básico' */}
          {activeTab !== 'basico' && (
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0 border border-slate-200 dark:border-slate-700">
              <button 
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  previewDevice === 'desktop' 
                    ? 'bg-white dark:bg-slate-700 text-[#0094eb] shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Monitor size={16} /> Desktop
              </button>
              <button 
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  previewDevice === 'mobile' 
                    ? 'bg-white dark:bg-slate-700 text-[#0094eb] shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                }`}
              >
                <Smartphone size={16} /> Mobile
              </button>
            </div>
          )}
        </div>

        {/* ÁREA CENTRAL (CONTROLES + PREVIEW) */}
        <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-900/50">
          
          {/* ESQUERDA - CONTROLES */}
          <div className="w-[400px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-6 flex flex-col gap-6 shrink-0 custom-scrollbar">
            
            {activeTab === 'basico' ? (
              // CONTROLES ABA BÁSICO
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Configurações Básicas</h3>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Nome do Estilo</label>
                    <input 
                      type="text" 
                      value={styleName}
                      onChange={(e) => setStyleName(e.target.value)}
                      placeholder="Ex: Minha Loja"
                      className="w-full px-4 py-2.5 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0094eb] outline-none dark:bg-slate-800 dark:text-white font-medium"
                    />
                  </div>

                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="mt-1">
                        <input 
                          type="checkbox" 
                          checked={isDefault}
                          onChange={(e) => setIsDefault(e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb]"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">Definir como padrão</p>
                        <p className="text-xs text-slate-500 mt-1">Vídeos sem estilo definido usarão este modelo automaticamente.</p>
                      </div>
                    </label>
                  </div>

                  <div className={`p-4 border rounded-xl transition-colors ${isUnified ? 'border-[#0094eb]/40 bg-[#0094eb]/5' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50'}`}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <div className="mt-1">
                        <input 
                          type="checkbox" 
                          checked={isUnified}
                          onChange={(e) => setIsUnified(e.target.checked)}
                          className="w-5 h-5 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb]"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-white">Unificar dispositivos</p>
                        <p className="text-xs text-slate-500 mt-1">As alterações que você fizer em Desktop serão aplicadas automaticamente ao Mobile.</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              // CONTROLES OUTRAS ABAS (Flutuante, etc)
              <>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white capitalize">
                  Configurações do {activeTab.replace('-', ' ')}
                </h3>

                {/* CARD DISPOSITIVO (Controle de Edição Esquerdo) */}
                <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Editando</span>
                  
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-[#0094eb]/30 rounded-full px-2 py-1 shadow-sm">
                    <button 
                      onClick={() => !isUnified && setPreviewDevice('desktop')}
                      className={`p-1 rounded-md transition-colors ${
                        (isUnified || previewDevice === 'desktop') ? 'text-[#0094eb]' : 'text-slate-400 hover:text-slate-600'
                      } ${isUnified ? 'cursor-default' : 'cursor-pointer'}`}
                      title={isUnified ? "Unificado" : "Editar Desktop"}
                    >
                      <Monitor size={16} strokeWidth={2.5} />
                    </button>
                    
                    {isUnified ? (
                      <Link size={14} className="text-[#0094eb] mx-1" strokeWidth={2.5} />
                    ) : (
                      <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                    )}

                    <button 
                      onClick={() => !isUnified && setPreviewDevice('mobile')}
                      className={`p-1 rounded-md transition-colors ${
                        (isUnified || previewDevice === 'mobile') ? 'text-[#0094eb]' : 'text-slate-400 hover:text-slate-600'
                      } ${isUnified ? 'cursor-default' : 'cursor-pointer'}`}
                      title={isUnified ? "Unificado" : "Editar Mobile"}
                    >
                      <Smartphone size={16} strokeWidth={2.5} />
                    </button>
                  </div>
                </div>

                {/* ACCORDIONS */}
                <div className="space-y-3">
                  {['1. Formato & Dimensões', '2. Posição & Margens', '3. Bordas', '4. Elementos Visíveis'].map((title, idx) => (
                    <div key={idx} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                      <button 
                        onClick={() => setOpenAccordion(openAccordion === title ? null : title)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <span className="font-bold text-sm text-slate-800 dark:text-white">{title}</span>
                        <ChevronDown size={18} className={`text-slate-400 transition-transform ${openAccordion === title ? 'rotate-180' : ''}`} />
                      </button>
                      {openAccordion === title && (
                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                          <p className="text-xs text-slate-400 italic">Controles em desenvolvimento...</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* DIREITA - ÁREA DE PREVIEW */}
          <div className="flex-1 flex items-center justify-center p-8 relative overflow-hidden h-full">
            
            {activeTab === 'basico' ? (
              // PREVIEW BÁSICO IDÊNTICO AO PRINT 2
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-600 p-10 w-full max-w-3xl flex flex-col items-center justify-center shadow-sm">
                
                {isDefault && (
                  <div className="inline-flex items-center gap-1.5 bg-[#e6f7ef] text-[#1a8c54] px-4 py-1.5 rounded-full text-[11px] font-black tracking-wide mb-8 uppercase">
                    <Star size={14} fill="currentColor" /> ESTILO PADRÃO DA LOJA
                  </div>
                )}

                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">IDENTIFICAÇÃO</p>
                <h2 className="text-4xl font-black text-[#1a1f36] dark:text-white mb-12 uppercase">{styleName || 'NOME DO ESTILO'}</h2>

                {/* CAIXA CINZA COM O GRÁFICO DE CONEXÃO */}
                <div className="bg-[#f8f9fb] dark:bg-slate-800/50 rounded-2xl p-8 w-full max-w-xl flex items-center justify-between relative border border-slate-100 dark:border-slate-700 mb-8">
                  
                  {/* Linha conectora de fundo */}
                  <div className="absolute top-[45%] left-24 right-24 h-0.5 bg-[#0094eb] z-0"></div>

                  {/* Desktop Block */}
                  <div className="flex flex-col items-center gap-4 z-10 bg-[#f8f9fb] dark:bg-slate-800 px-2">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#1a1f36] dark:text-white shadow-sm">
                      <Monitor size={40} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">DESKTOP</span>
                  </div>

                  {/* Link/Unlink Central Pill */}
                  <div className="z-10 flex flex-col items-center gap-2 bg-[#f8f9fb] dark:bg-slate-800 px-2 mt-[-20px]">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border-2 shadow-sm
                      ${isUnified ? 'border-[#0094eb] text-[#1a1f36]' : 'border-slate-300 text-slate-400'}`}>
                      {isUnified ? <Link size={18} strokeWidth={2.5} /> : <Link2Off size={18} strokeWidth={2.5} />}
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isUnified ? 'text-[#0094eb]' : 'text-slate-400'}`}>
                      {isUnified ? 'UNIFICADOS' : 'SEPARADOS'}
                    </span>
                  </div>

                  {/* Mobile Block */}
                  <div className="flex flex-col items-center gap-4 z-10 bg-[#f8f9fb] dark:bg-slate-800 px-2">
                    <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#1a1f36] dark:text-white shadow-sm">
                      <Smartphone size={32} strokeWidth={1.5} />
                    </div>
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">MOBILE</span>
                  </div>
                </div>

                <p className="text-sm text-slate-500 font-medium text-center px-4 max-w-lg">
                  {isUnified 
                    ? 'Configuração unificada: As alterações que você fizer em Desktop serão aplicadas automaticamente ao Mobile.'
                    : 'Configuração separada: Você terá que configurar a aparência do Desktop e do Mobile individualmente.'}
                </p>
              </div>
            ) : (
              // PREVIEW OUTROS FORMATOS
              <div className="w-full h-full flex items-center justify-center">
                
                {previewDevice === 'desktop' ? (
                  // MOCKUP BROWSER (DESKTOP)
                  <div className="w-full max-w-5xl aspect-video bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                     {/* Top bar navegador */}
                     <div className="h-10 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center px-4 gap-2 shrink-0">
                        <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                        <div className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                     </div>
                     {/* Conteúdo Desktop */}
                     <div className="flex-1 relative bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                        <span className="z-10 text-slate-400 font-bold uppercase tracking-widest">
                           Preview do {activeTab} (Desktop)
                        </span>
                     </div>
                  </div>
                ) : (
                  // MOCKUP MOBILE
                  <div className="h-full max-h-[800px] aspect-[9/19] rounded-[2.5rem] border-[10px] border-[#1a1f36] bg-slate-50 dark:bg-slate-900 shadow-2xl relative flex items-center justify-center overflow-hidden shrink-0">
                    
                    {/* Detalhe da câmera/notch do celular */}
                    <div className="absolute top-0 inset-x-0 h-5 bg-[#1a1f36] w-[40%] mx-auto rounded-b-xl z-20"></div>

                  {/* CARROSSEL */}
                  {activeTab === 'carrossel' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-900">Dispositivo</h3>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button 
                            onClick={() => setCarouselDevice('desktop')} 
                            className={`px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 ${carouselDevice === 'desktop' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            <Monitor size={14} /> Desktop
                          </button>
                          <button 
                            onClick={() => setCarouselDevice('mobile')} 
                             
                            className={`px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 ${carouselDevice === 'mobile' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            <Smartphone size={14} /> Mobile
                          </button>
                        </div>
                      </div>

                      <SectionCard title="Aparência do Carrossel" description="Estilo visual dos vídeos exibidos em formato de carrossel.">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField label="Estilo dos Itens">
                            <select 
                              value={getConfig(carouselDevice, 'carousel_style') || 'stories'} 
                              onChange={e => setConfig(carouselDevice, 'carousel_style', e.target.value)} 
                              className={selectClass}
                            >
                              <option value="stories">Stories (Redondos)</option>
                              <option value="cards">Cards (Retangulares)</option>
                            </select>
                          </FormField>
                          <FormField label="Tamanho dos Itens (px)">
                            <input 
                              type="number" min="40" max="200" 
                              value={getConfig(carouselDevice, 'carousel_item_size') || 80} 
                              onChange={e => setConfig(carouselDevice, 'carousel_item_size', parseInt(e.target.value) || 80)} 
                              className={inputClass} 
                            />
                          </FormField>
                          <FormField label="Espaçamento (Gap em px)">
                            <input 
                              type="number" min="0" max="50" 
                              value={getConfig(carouselDevice, 'carousel_gap') || 12} 
                              onChange={e => setConfig(carouselDevice, 'carousel_gap', parseInt(e.target.value) || 12)} 
                              className={inputClass} 
                            />
                          </FormField>
                          <FormField label="Cor da Borda">
                             <ColorInput 
                               label="Borda" 
                               value={getConfig(carouselDevice, 'carousel_border_color') || '#0094EB'} 
                               onChange={e => setConfig(carouselDevice, 'carousel_border_color', e.target.value)} 
                             />
                          </FormField>
                        </div>
                      </SectionCard>

                      <SectionCard title="Posicionamento na Página" description="Onde o carrossel será injetado no site da loja.">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField label="Posição Padrão">
                            <select 
                              value={getConfig(carouselDevice, 'carousel_position') || 'top'} 
                              onChange={e => setConfig(carouselDevice, 'carousel_position', e.target.value)} 
                              className={selectClass}
                            >
                              <option value="top">Início da Página (Topo)</option>
                              <option value="bottom">Fim da Página (Rodapé)</option>
                              <option value="custom">Elemento Específico (Customizado)</option>
                            </select>
                          </FormField>
                          <FormField label="Seletor HTML (Se customizado)">
                            <input 
                              type="text" 
                              placeholder="ex: #meu-carrossel"
                              value={getConfig(carouselDevice, 'carousel_custom_selector') || ''} 
                              onChange={e => setConfig(carouselDevice, 'carousel_custom_selector', e.target.value)} 
                              className={inputClass} 
                            />
                          </FormField>
                        </div>
                      </SectionCard>
                    </div>
                  )}

                    {activeTab === 'flutuante' && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-slate-900">Dispositivo</h3>
                        <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button 
                            onClick={() => setFloatingDevice('desktop')} 
                            className={`px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 ${floatingDevice === 'desktop' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            <Monitor size={14} /> Desktop
                          </button>
                          <button 
                            onClick={() => setFloatingDevice('mobile')} 
                             
                            className={`px-4 py-1.5 text-xs font-medium rounded-md flex items-center gap-2 ${floatingDevice === 'mobile' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                          >
                            <Smartphone size={14} /> Mobile
                          </button>
                        </div>
                      </div>

                      <SectionCard title="Aparência do Widget" description="Como a bolinha flutuante será exibida no site.">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField label="Posição na Tela">
                            <select 
                              value={getConfig(floatingDevice, 'floating_position') || 'bottom-right'} 
                              onChange={e => setConfig(floatingDevice, 'floating_position', e.target.value)} 
                              className={selectClass}
                            >
                              <option value="bottom-left">Inferior Esquerda</option>
                              <option value="bottom-right">Inferior Direita</option>
                            </select>
                          </FormField>
                          <FormField label="Tamanho da Bolinha (px)">
                            <input 
                              type="number" min="40" max="120" 
                              value={getConfig(floatingDevice, 'floating_size') || 80} 
                              onChange={e => setConfig(floatingDevice, 'floating_size', parseInt(e.target.value) || 80)} 
                              className={inputClass} 
                            />
                          </FormField>
                          <FormField label="Arredondamento da Borda (px)">
                            <input 
                              type="number" min="0" max="100" 
                              value={getConfig(floatingDevice, 'floating_border_radius') || 100} 
                              onChange={e => setConfig(floatingDevice, 'floating_border_radius', parseInt(e.target.value) || 0)} 
                              className={inputClass} 
                            />
                          </FormField>
                          <FormField label="Espessura da Borda (px)">
                            <input 
                              type="number" min="0" max="10" 
                              value={getConfig(floatingDevice, 'floating_border_width') || 2} 
                              onChange={e => setConfig(floatingDevice, 'floating_border_width', parseInt(e.target.value) || 0)} 
                              className={inputClass} 
                            />
                          </FormField>
                          <FormField label="Sombra Externa">
                            <select 
                              value={getConfig(floatingDevice, 'floating_shadow') || 'md'} 
                              onChange={e => setConfig(floatingDevice, 'floating_shadow', e.target.value)} 
                              className={selectClass}
                            >
                              <option value="none">Sem sombra</option>
                              <option value="sm">Leve</option>
                              <option value="md">Média</option>
                              <option value="lg">Forte</option>
                            </select>
                          </FormField>
                          <FormField label="Cor da Borda Personalizada">
                             <ColorInput 
                               label="Borda" 
                               value={getConfig(floatingDevice, 'floating_border_color') || '#0094EB'} 
                               onChange={e => setConfig(floatingDevice, 'floating_border_color', e.target.value)} 
                             />
                          </FormField>
                        </div>
                      </SectionCard>

                      <SectionCard title="Espaçamento" description="Distância da bolinha em relação aos cantos da tela.">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField label="Margem Inferior (px)">
                            <input 
                              type="number" min="0" max="200" 
                              value={getConfig(floatingDevice, 'floating_margin_bottom') || 20} 
                              onChange={e => setConfig(floatingDevice, 'floating_margin_bottom', parseInt(e.target.value) || 0)} 
                              className={inputClass} 
                            />
                          </FormField>
                          <FormField label="Margem Lateral (px)">
                            <input 
                              type="number" min="0" max="200" 
                              value={getConfig(floatingDevice, 'floating_margin_side') || 20} 
                              onChange={e => setConfig(floatingDevice, 'floating_margin_side', parseInt(e.target.value) || 0)} 
                              className={inputClass} 
                            />
                          </FormField>
                        </div>
                      </SectionCard>
                    </div>
                  )}

                    <span className="z-10 text-slate-400 text-sm font-bold uppercase tracking-widest text-center px-4">
                       Preview do {activeTab} (Mobile)
                    </span>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
          
          <button className="bg-red-50 text-red-500 font-extrabold px-5 py-2.5 rounded-xl text-sm tracking-wide border border-transparent outline-none">
            RESETAR
          </button>

          <div className="hidden lg:flex items-center gap-2 text-slate-500 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-full text-sm">
            <CornerUpLeft size={16} className="text-[#0094eb]" />
            <span>Este painel é um <strong>preview meramente visual</strong>. Para testar cliques e interações, use o simulador na edição dos stories.</span>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} strokeWidth={2.5} /> Cancelar
            </button>
            <button className="flex items-center gap-2 px-6 py-2.5 bg-[#0094eb] text-white rounded-xl text-sm font-bold shadow-md transition-none">
              <Save size={18} strokeWidth={2.5} /> Salvar
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AparenciaModal;
