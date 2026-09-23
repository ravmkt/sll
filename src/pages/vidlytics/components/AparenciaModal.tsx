import React, { useState } from 'react';
import { 
  X, Monitor, Smartphone, Link, Link2Off, 
  Settings2, PlaySquare, Layout, LayoutGrid, MonitorPlay,
  ChevronDown, Check
} from 'lucide-react';

interface AparenciaModalProps {
  isOpen: boolean;
  onClose: () => void;
  styleData?: any;
}

const AparenciaModal: React.FC<AparenciaModalProps> = ({ isOpen, onClose, styleData }) => {
  const [activeTab, setActiveTab] = useState('basico');
  const [isUnified, setIsUnified] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [styleName, setStyleName] = useState('Estilo Padrão');
  const [isDefault, setIsDefault] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<string | null>('formato');

  if (!isOpen) return null;

  const tabs = [
    { id: 'basico', label: 'Básico', icon: Settings2 },
    { id: 'flutuante', label: 'Flutuante', icon: PlaySquare },
    { id: 'carrossel', label: 'Carrossel', icon: Layout },
    { id: 'carrossel-dinamico', label: 'Carrossel Dinâmico', icon: Layout },
    { id: 'grade', label: 'Grade', icon: LayoutGrid },
    { id: 'player', label: 'Player (Modal)', icon: MonitorPlay },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {styleData ? 'Editar Estilo' : 'Criar Novo Estilo'}
            </h2>
            <p className="text-sm text-slate-500">Configure layouts, cores e tipografia de cada formato dos vídeos.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* TABS */}
        <div className="px-6 pt-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap
                    ${isActive 
                      ? 'bg-[#0094eb] text-white shadow-md' 
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab !== 'basico' && (
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 mb-4 shrink-0">
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'
                }`}
              >
                <Smartphone size={16} /> Mobile
              </button>
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                  previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 shadow text-slate-800 dark:text-white' : 'text-slate-500'
                }`}
              >
                <Monitor size={16} /> Desktop
              </button>
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 flex overflow-hidden bg-slate-50 dark:bg-slate-900/50">
          
          {/* ESQUERDA - CONTROLES */}
          <div className="w-[400px] border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-y-auto p-6 flex flex-col gap-6 shrink-0">
            {activeTab === 'basico' && (
              <>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">Dados Básicos</h3>
                  <p className="text-sm text-slate-500 mb-4">Defina o nome do estilo e o comportamento global entre Desktop e Mobile.</p>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Nome do Estilo</label>
                      <input 
                        type="text" 
                        value={styleName}
                        onChange={(e) => setStyleName(e.target.value)}
                        placeholder="Ex: Estilo Padrão"
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-[#0094eb] outline-none dark:bg-slate-800 dark:text-white"
                      />
                    </div>

                    <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <div className="mt-1 flex-shrink-0">
                          <input 
                            type="checkbox" 
                            checked={isDefault}
                            onChange={(e) => setIsDefault(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb]"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white">Definir como padrão</p>
                          <p className="text-xs text-slate-500">Vídeos sem estilo definido usarão este modelo automaticamente.</p>
                        </div>
                      </label>
                    </div>

                    <div className="p-4 border border-[#0094eb]/30 bg-[#0094eb]/5 rounded-xl">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <div className="mt-1 flex-shrink-0">
                          <input 
                            type="checkbox" 
                            checked={isUnified}
                            onChange={(e) => setIsUnified(e.target.checked)}
                            className="w-5 h-5 rounded border-slate-300 text-[#0094eb] focus:ring-[#0094eb]"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 dark:text-white">Unificar dispositivos</p>
                          <p className="text-xs text-slate-500">Aplica as mesmas configurações em Desktop e Mobile.</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab !== 'basico' && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white capitalize">Configurações do {activeTab.replace('-', ' ')}</h3>
                </div>

                <div className="space-y-3">
                  {/* Accordion 1 */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <button 
                      onClick={() => setOpenAccordion(openAccordion === 'formato' ? null : 'formato')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 transition-colors"
                    >
                      <span className="font-semibold text-sm text-slate-800 dark:text-white">1. Formato & Dimensões</span>
                      <ChevronDown size={18} className={`text-slate-500 transition-transform ${openAccordion === 'formato' ? 'rotate-180' : ''}`} />
                    </button>
                    {openAccordion === 'formato' && (
                      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <p className="text-xs text-slate-500">Controles em breve...</p>
                      </div>
                    )}
                  </div>

                  {/* Accordion 2 */}
                  <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                    <button 
                      onClick={() => setOpenAccordion(openAccordion === 'posicao' ? null : 'posicao')}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 transition-colors"
                    >
                      <span className="font-semibold text-sm text-slate-800 dark:text-white">2. Posição & Margens</span>
                      <ChevronDown size={18} className={`text-slate-500 transition-transform ${openAccordion === 'posicao' ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* DIREITA - PREVIEW */}
          <div className="flex-1 flex items-center justify-center p-8 relative">
            {activeTab !== 'basico' && (
              <span className="absolute top-4 right-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Visualização ({previewDevice.toUpperCase()})
              </span>
            )}

            {activeTab === 'basico' && (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-10 max-w-lg w-full text-center shadow-sm">
                
                {isDefault && (
                  <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6">
                    <Check size={14} /> PADRÃO DA LOJA
                  </div>
                )}

                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Identificação</p>
                <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-12 truncate">{styleName || 'Nome do Estilo'}</h2>

                <div className="flex items-center justify-center gap-4 relative">
                  <div className="flex flex-col items-center gap-3 z-10 bg-white dark:bg-slate-900 px-4">
                    <div className="w-16 h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                      <Monitor size={32} />
                    </div>
                    <span className="text-xs font-bold text-slate-500">DESKTOP</span>
                  </div>

                  <div className="flex-1 max-w-[200px] flex flex-col items-center justify-center absolute left-0 right-0 mx-auto">
                    <div className={`w-full border-t-2 transition-all duration-300 ${isUnified ? 'border-[#0094eb] border-solid' : 'border-slate-300 border-dashed'}`}></div>
                    <div className={`-mt-4 w-8 h-8 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 ${isUnified ? 'text-[#0094eb] shadow-[0_0_0_4px_rgba(0,148,235,0.1)]' : 'text-slate-400'}`}>
                      {isUnified ? <Link size={18} /> : <Link2Off size={18} />}
                    </div>
                    <span className={`text-[10px] font-bold mt-2 uppercase tracking-wider ${isUnified ? 'text-[#0094eb]' : 'text-slate-400'}`}>
                      {isUnified ? 'Unificados' : 'Separados'}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-3 z-10 bg-white dark:bg-slate-900 px-4">
                    <div className="w-16 h-16 rounded-2xl border-2 border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-400">
                      <Smartphone size={32} />
                    </div>
                    <span className="text-xs font-bold text-slate-500">MOBILE</span>
                  </div>
                </div>

                <p className="mt-12 text-sm text-slate-500 px-8">
                  {isUnified 
                    ? 'Alterações em Desktop serão aplicadas automaticamente ao Mobile.'
                    : 'Personalize aparências diferentes para Desktop e Mobile.'}
                </p>
              </div>
            )}

            {activeTab !== 'basico' && (
              <div className="w-full h-full flex items-center justify-center transition-all duration-500">
                <div className={`relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden transition-all duration-300 flex items-center justify-center
                  ${previewDevice === 'desktop' ? 'w-full max-w-3xl aspect-video rounded-xl' : 'w-[320px] h-[600px] rounded-[2.5rem] border-8'}
                `}>
                  <div className="absolute inset-0 bg-slate-50 dark:bg-slate-900 flex flex-col p-8 opacity-50">
                    <div className="w-1/3 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                    <div className="w-full h-32 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
                    <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
                  </div>

                  {activeTab === 'flutuante' && (
                    <div className="absolute bottom-6 right-6 w-24 h-40 bg-slate-900 rounded-xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col items-center justify-center">
                      <div className="absolute top-2 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-sm">AO VIVO</div>
                      <PlaySquare className="text-white/50 w-8 h-8 mb-4" />
                      <div className="absolute bottom-2 w-20 h-6 bg-[#0094eb] rounded-full flex items-center justify-center text-[9px] font-bold text-white">Comprar</div>
                    </div>
                  )}
                  {activeTab !== 'flutuante' && (
                    <p className="z-10 text-slate-400 font-semibold">Preview: {activeTab}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-4">
            <button className="px-8 py-2.5 bg-[#0094eb] hover:bg-blue-600 text-white rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2">
              <Check size={16} /> Salvar Estilo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AparenciaModal;
