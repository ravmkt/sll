import React, { useState } from "react";
import { 
  X, 
  Monitor, 
  Smartphone, 
  Play, 
  ChevronDown, 
  Sliders, 
  Layers, 
  Grid3X3
} from "lucide-react";

interface AppearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  initialData?: any;
}

type TabType = "basic" | "floating" | "carousel" | "dynamic_carousel" | "grid" | "player";
type DeviceType = "desktop" | "mobile";

export default function AppearanceModal({ isOpen, onClose, onSave, initialData }: AppearanceModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("floating");
  const [device, setDevice] = useState<DeviceType>("mobile");
  
  // Cores Vidlytics
  const VIDLYTICS_BLUE = "#0094eb";
  const VIDLYTICS_ORANGE = "#fd8539";

  const [styleName, setStyleName] = useState(initialData?.name || "Estilo Padrão Vidlytics");
  const [isDefault, setIsDefault] = useState(initialData?.is_default !== undefined ? initialData.is_default : true);
  const [useAllDevices, setUseAllDevices] = useState(initialData?.use_all_devices || false);
  const [primaryColor, setPrimaryColor] = useState(initialData?.primary_color || VIDLYTICS_BLUE);
  const [accentColor, setAccentColor] = useState(initialData?.accent_color || VIDLYTICS_ORANGE);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "1": true,
    "2": false,
    "3": false,
    "4": false,
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-5 animate-in fade-in duration-200">
      {/* Modal Expandido e Fluido */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-[96vw] max-w-[1550px] h-[92vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
              {initialData?.id ? "Editar Estilo" : "Criar Novo Estilo"}
            </h2>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-gray-100 dark:border-gray-800 overflow-x-auto bg-gray-50/50 dark:bg-gray-900/30 shrink-0">
          {[
            { id: "basic", label: "Básico", icon: Sliders },
            { id: "floating", label: "Flutuante", icon: Play },
            { id: "carousel", label: "Carrossel", icon: Layers },
            { id: "dynamic_carousel", label: "Carrossel Dinâmico", icon: Layers },
            { id: "grid", label: "Grade", icon: Grid3X3 },
            { id: "player", label: "Player", icon: Play },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-[#0094eb] text-white shadow-xs"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Corpo */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Coluna Esquerda: Controles */}
          <div className="w-full lg:w-[400px] xl:w-[420px] shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto p-5 space-y-4 bg-white dark:bg-gray-900">
            {activeTab === "basic" ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Dados Básicos</h3>
                  <p className="text-xs text-gray-400">Configurações globais do estilo.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nome do Estilo</label>
                  <input
                    type="text"
                    value={styleName}
                    onChange={(e) => setStyleName(e.target.value)}
                    placeholder="Ex: Estilo Padrão Vidlytics"
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0094eb]"
                  />
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Definir como padrão</div>
                    <div className="text-[11px] text-gray-400">Estilo ativo padrão da loja</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 text-[#0094eb] rounded border-gray-300 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Usar em todos os dispositivos</div>
                    <div className="text-[11px] text-gray-400">Aplica para desktop e mobile</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={useAllDevices}
                    onChange={(e) => setUseAllDevices(e.target.checked)}
                    className="w-4 h-4 text-[#0094eb] rounded border-gray-300 cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 space-y-2.5">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">Cor Principal</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg uppercase"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  Configurações do {activeTab === "floating" ? "Flutuante" : activeTab.replace("_", " ")}
                </h3>

                {/* Alternador interno */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Dispositivo</span>
                  <div className="flex bg-gray-200 dark:bg-gray-900 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setDevice("desktop")}
                      className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        device === "desktop" ? "bg-[#0094eb] text-white shadow-xs" : "text-gray-500"
                      }`}
                    >
                      <Monitor className="w-3.5 h-3.5" /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setDevice("mobile")}
                      className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        device === "mobile" ? "bg-[#0094eb] text-white shadow-xs" : "text-gray-500"
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" /> Mobile
                    </button>
                  </div>
                </div>

                {/* Accordions */}
                {[
                  { id: "1", title: "1. Formato & Dimensões" },
                  { id: "2", title: "2. Posição & Margens" },
                  { id: "3", title: "3. Bordas" },
                  { id: "4", title: "4. Elementos Visíveis" },
                ].map((sec) => (
                  <div key={sec.id} className="border border-gray-200 dark:border-gray-700/80 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
                    >
                      <span>{sec.title}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSections[sec.id] ? "rotate-180" : ""}`} />
                    </button>
                    {openSections[sec.id] && (
                      <div className="p-3 text-xs border-t border-gray-100 dark:border-gray-800 text-gray-500 space-y-2 bg-gray-50/40 dark:bg-gray-950/20">
                        <div className="flex items-center justify-between">
                          <span>Largura</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200 font-semibold">{device === "desktop" ? "120px" : "80px"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Margem Inferior</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200 font-semibold">20px</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Ícone de Play</span>
                          <input type="checkbox" defaultChecked className="w-4 h-4 text-[#0094eb] rounded cursor-pointer" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita: Ampla Área de Visualização */}
          <div className="flex-1 bg-slate-50/80 dark:bg-gray-950/40 p-4 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden">
            
            {/* BOTÃO DE TRANSIÇÃO (Canto Superior Direito) NO AZUL VIDLYTICS (#0094eb) */}
            <div className="absolute top-4 right-5 z-20 flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-1 rounded-xl shadow-xs">
              <button 
                type="button"
                onClick={() => setDevice("desktop")} 
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  device === "desktop" 
                    ? "bg-[#0094eb] text-white shadow-xs" 
                    : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
                title="Visualizar Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button 
                type="button"
                onClick={() => setDevice("mobile")} 
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  device === "mobile" 
                    ? "bg-[#0094eb] text-white shadow-xs" 
                    : "text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                }`}
                title="Visualizar Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* PREVIEWS */}
            {device === "desktop" ? (
              /* MOCKUP DESKTOP SLIM */
              <div className="w-full max-w-4xl aspect-[16/9] max-h-[500px] bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl flex flex-col overflow-hidden animate-in fade-in duration-200">
                <div className="h-8 bg-gray-100/90 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80"></span>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80"></span>
                  </div>
                  <div className="flex-1 max-w-xs mx-auto bg-white dark:bg-gray-900 h-5 rounded-md text-[10px] text-gray-400 flex items-center justify-center border border-gray-200/80 dark:border-gray-700">
                    sualoja.com.br
                  </div>
                </div>

                <div className="flex-1 bg-slate-50 dark:bg-gray-950 p-6 relative flex flex-col justify-center overflow-hidden">
                  {activeTab === "floating" && (
                    <div className="absolute bottom-6 right-8 w-24 h-40 rounded-2xl overflow-hidden shadow-xl group border-2" style={{ borderColor: primaryColor }}>
                      <img 
                        src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80" 
                        className="w-full h-full object-cover" 
                        alt="Preview"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow">
                          <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {(activeTab === "carousel" || activeTab === "dynamic_carousel") && (
                    <div className="w-full flex items-center justify-center gap-4 px-4">
                      {[1, 2, 3, 4].map((item) => (
                        <div 
                          key={item} 
                          className="w-36 h-56 rounded-2xl overflow-hidden shadow-md relative flex flex-col justify-between p-2.5 border-2"
                          style={{ borderColor: item === 2 ? primaryColor : "transparent" }}
                        >
                          <img 
                            src={`https://images.unsplash.com/photo-${1515886657613 + item * 2000}?w=300&auto=format&fit=crop&q=80`} 
                            className="absolute inset-0 w-full h-full object-cover" 
                            alt="" 
                          />
                          <div className="relative z-10 w-full flex justify-center my-auto">
                            <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow">
                              <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {activeTab === "grid" && (
                    <div className="grid grid-cols-4 gap-3 w-full max-w-2xl mx-auto">
                      {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-40 rounded-2xl overflow-hidden bg-black relative border-2" style={{ borderColor: primaryColor }}>
                          <img src={`https://images.unsplash.com/photo-${1515886657613 + item * 1000}?w=300&auto=format&fit=crop&q=80`} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow">
                              <Play className="w-3 h-3 fill-black text-black ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* MOCKUP MOBILE ULTRA SUTIL (Bordas finas de 1.5px, acabamento elegante) */
              <div className="w-[275px] h-[530px] rounded-[36px] border-[1.5px] border-slate-300 dark:border-slate-700 bg-slate-900 shadow-xl relative overflow-hidden flex flex-col animate-in fade-in duration-200">
                
                {/* Linha da câmera sutil */}
                <div className="w-14 h-2.5 bg-gray-800/80 rounded-full mx-auto absolute top-2.5 left-1/2 -translate-x-1/2 z-30" />

                {/* Tela */}
                <div className="w-full h-full relative bg-[#0b0f19] flex flex-col justify-center items-center overflow-hidden">
                  
                  {activeTab === "floating" && (
                    <div className="absolute bottom-6 right-4 w-16 h-28 rounded-2xl border-2 overflow-hidden shadow-2xl bg-black group" style={{ borderColor: primaryColor }}>
                      <img 
                        src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80" 
                        className="w-full h-full object-cover" 
                        alt="Preview"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-6 h-6 rounded-full bg-white/95 flex items-center justify-center shadow">
                          <Play className="w-3 h-3 fill-black text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {(activeTab === "carousel" || activeTab === "dynamic_carousel") && (
                    <div className="w-full px-2 flex items-center justify-center gap-2">
                      <div className="w-12 h-20 rounded-xl opacity-35 overflow-hidden bg-black scale-90">
                        <img src="https://images.unsplash.com/photo-1526336024174-e58f5fadae20?w=200&auto=format&fit=crop&q=80" className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="w-36 h-56 rounded-2xl border-2 overflow-hidden shadow-xl bg-black relative flex flex-col justify-between p-2" style={{ borderColor: primaryColor }}>
                        <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80" className="absolute inset-0 w-full h-full object-cover" alt="" />
                        <div className="relative z-10 w-full flex justify-center my-auto">
                          <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow">
                            <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                          </div>
                        </div>
                        <div className="relative z-10 bg-white/95 dark:bg-gray-900/95 rounded-xl p-1.5 flex items-center gap-2 shadow">
                          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&auto=format&fit=crop&q=80" className="w-6 h-6 rounded-md object-cover" alt="" />
                          <div className="min-w-0">
                            <div className="text-[9px] font-bold text-gray-800 dark:text-white truncate">Look Verão</div>
                            <div className="text-[9px] font-extrabold" style={{ color: primaryColor }}>R$ 149,95</div>
                          </div>
                        </div>
                      </div>
                      <div className="w-12 h-20 rounded-xl opacity-35 overflow-hidden bg-black scale-90">
                        <img src="https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&auto=format&fit=crop&q=80" className="w-full h-full object-cover" alt="" />
                      </div>
                    </div>
                  )}

                  {activeTab === "grid" && (
                    <div className="grid grid-cols-2 gap-2 p-3 w-full">
                      {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-32 rounded-xl border-2 overflow-hidden bg-black relative" style={{ borderColor: primaryColor }}>
                          <img src={`https://images.unsplash.com/photo-${1515886657613 + item * 1000}?w=200&auto=format&fit=crop&q=80`} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-white/90 flex items-center justify-center">
                              <Play className="w-2.5 h-2.5 fill-black text-black ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Home indicator sutil */}
                  <div className="w-20 h-1 bg-white/30 rounded-full mx-auto absolute bottom-2 left-1/2 -translate-x-1/2 z-30" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setStyleName("Estilo Padrão Vidlytics");
              setPrimaryColor(VIDLYTICS_BLUE);
              setIsDefault(true);
            }}
            className="px-3 py-1.5 text-rose-500 font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
          >
            Resetar
          </button>
          
          <div className="text-gray-400 hidden sm:block">
            <span>ℹ Este painel é um <strong>preview meramente visual</strong>.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSave({ 
                name: styleName, 
                is_default: isDefault, 
                primary_color: primaryColor,
                use_all_devices: useAllDevices
              })}
              className="px-5 py-2 bg-[#0094eb] hover:bg-blue-600 text-white font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
