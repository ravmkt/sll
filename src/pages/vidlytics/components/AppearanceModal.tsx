import React, { useState } from "react";
import { 
  X, 
  Monitor, 
  Smartphone, 
  Play, 
  ChevronDown, 
  Check, 
  Layers, 
  Sliders, 
  Grid3X3, 
  Heart,
  MessageCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  Maximize2
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
  const [activeTab, setActiveTab] = useState<TabType>("basic");
  const [device, setDevice] = useState<DeviceType>("mobile");
  
  // Cores do Vidlytics / SLL
  const VIDLYTICS_BLUE = "#0094eb";
  const VIDLYTICS_ORANGE = "#fd8539";

  // Estados com preset padrão Vidlytics
  const [styleName, setStyleName] = useState(initialData?.name || "Estilo Padrão Vidlytics");
  const [isDefault, setIsDefault] = useState(initialData?.is_default !== undefined ? initialData.is_default : true);
  const [useAllDevices, setUseAllDevices] = useState(initialData?.use_all_devices || false);
  const [primaryColor, setPrimaryColor] = useState(initialData?.primary_color || VIDLYTICS_BLUE);
  const [accentColor, setAccentColor] = useState(initialData?.accent_color || VIDLYTICS_ORANGE);

  // Accordions
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    "1": true,
    "2": false,
    "3": false,
    "4": false,
    "5": false
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-[95vw] max-w-[1600px] h-[92vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-all">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              {initialData?.id ? "Editar Estilo" : "Criar Novo Estilo"}
            </h2>
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-[#0094eb] font-semibold border border-blue-100 dark:border-blue-900/50">
              {activeTab.replace("_", " ").toUpperCase()}
            </span>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center gap-2 px-6 py-2.5 border-b border-gray-100 dark:border-gray-800 overflow-x-auto bg-gray-50/60 dark:bg-gray-900/40 shrink-0">
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
                className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#0094eb] text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="w-3.5 h-3.5" /> {tab.label}
              </button>
            );
          })}
        </div>

        {/* Corpo: Duas Colunas com Scroll Independente */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          
          {/* Coluna Esquerda: Painel de Configurações */}
          <div className="w-full lg:w-[380px] xl:w-[420px] shrink-0 border-r border-gray-100 dark:border-gray-800 overflow-y-auto p-5 space-y-4 bg-white dark:bg-gray-900">
            {activeTab === "basic" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Dados Básicos</h3>
                  <p className="text-xs text-gray-400">Defina o nome do estilo e o comportamento global entre Desktop e Mobile.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Nome do Estilo</label>
                  <input
                    type="text"
                    value={styleName}
                    onChange={(e) => setStyleName(e.target.value)}
                    placeholder="Ex: Estilo Padrão Vidlytics"
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0094eb]"
                  />
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Definir como padrão</div>
                    <div className="text-[11px] text-gray-400">Estilo aplicado automaticamente na loja</div>
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
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Usar aparência em todos os dispositivos</div>
                    <div className="text-[11px] text-gray-400">Aplica configurações de Desktop no Mobile</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={useAllDevices}
                    onChange={(e) => setUseAllDevices(e.target.checked)}
                    className="w-4 h-4 text-[#0094eb] rounded border-gray-300 cursor-pointer"
                  />
                </div>

                {/* Cores Oficiais Vidlytics */}
                <div className="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700/80 space-y-3">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 block">Paleta de Cores Vidlytics</span>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Cor Primária (Bordas e Ícones)</label>
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

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-gray-600 dark:text-gray-400">Cor de Destaque / CTA</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200 dark:border-gray-700"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-xs font-mono bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg uppercase"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab !== "basic" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Configurações do {activeTab.replace("_", " ")}
                  </h3>
                </div>

                {/* Alternador Desktop / Mobile interno do Form */}
                <div className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Dispositivo</span>
                  <div className="flex bg-gray-200 dark:bg-gray-900 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setDevice("desktop")}
                      className={`px-3 py-1 rounded-md font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                        device === "desktop" ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs" : "text-gray-500"
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

                {/* Seções Accordions */}
                {[
                  { id: "1", title: "1. Formato & Dimensões" },
                  { id: "2", title: "2. Posição & Margens" },
                  { id: "3", title: "3. Bordas & Sombras" },
                  { id: "4", title: "4. Elementos Visíveis" },
                  { id: "5", title: "5. Card de Produto & CTA" },
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
                      <div className="p-3 text-xs border-t border-gray-100 dark:border-gray-800 text-gray-500 space-y-2.5 bg-gray-50/50 dark:bg-gray-950/30">
                        <div className="flex items-center justify-between">
                          <span>Largura</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200 font-semibold">{device === "desktop" ? "120px" : "80px"}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Espaçamento</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200 font-semibold">12px</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Arredondamento</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200 font-semibold">16px</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Mostrar Ícone de Play</span>
                          <input type="checkbox" defaultChecked className="w-3.5 h-3.5 text-[#0094eb] rounded cursor-pointer" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita: Área de Preview Ampla */}
          <div className="flex-1 bg-slate-100/70 dark:bg-gray-950/60 p-6 flex flex-col items-center justify-center relative overflow-hidden">
            
            {/* Chave de Visualização Superior Direita */}
            <div className="absolute top-4 right-4 z-20 flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 rounded-xl p-1 shadow-sm">
              <button 
                type="button"
                onClick={() => setDevice("desktop")} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  device === "desktop" ? "bg-[#fd8539] text-white shadow-xs" : "hover:text-gray-900 dark:hover:text-white"
                }`}
                title="Visualizar em Desktop"
              >
                <Monitor className="w-3.5 h-3.5" /> Desktop Wide
              </button>
              <button 
                type="button"
                onClick={() => setDevice("mobile")} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  device === "mobile" ? "bg-[#fd8539] text-white shadow-xs" : "hover:text-gray-900 dark:hover:text-white"
                }`}
                title="Visualizar em Mobile"
              >
                <Smartphone className="w-3.5 h-3.5" /> Mobile Slim
              </button>
            </div>

            {/* PREVIEW BÁSICO */}
            {activeTab === "basic" ? (
              <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 max-w-md text-center space-y-4 shadow-sm">
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#0094eb]">Identificação do Estilo</span>
                <h4 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">{styleName || "Nome do Estilo"}</h4>
                
                <div className="flex items-center justify-center gap-6 py-4">
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 w-24">
                    <Monitor className="w-6 h-6 text-[#0094eb]" />
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">DESKTOP</span>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">
                    {useAllDevices ? "== IGUAL ==" : "-- INDEPENDENTE --"}
                  </span>
                  <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200/60 dark:border-gray-700/60 w-24">
                    <Smartphone className="w-6 h-6 text-[#fd8539]" />
                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-300">MOBILE</span>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs">
                  <span className="text-gray-500">Cores Ativas:</span>
                  <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: primaryColor }} />
                  <span className="w-4 h-4 rounded-full border border-white shadow-sm" style={{ backgroundColor: accentColor }} />
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {useAllDevices 
                    ? "Configuração unificada: O Mobile seguirá as mesmas diretrizes do Desktop."
                    : "Configuração independente: Personalize aparências diferentes para Desktop e Mobile de forma isolada."}
                </p>
              </div>
            ) : (
              /* PREVIEW DE COMPONENTES: DESKTOP WIDE OU MOBILE SLIM */
              <div className="w-full h-full flex items-center justify-center p-2">
                
                {/* 1. MOCKUP DESKTOP WIDE (16:9) */}
                {device === "desktop" ? (
                  <div className="w-full max-w-4xl aspect-[16/9] max-h-[520px] bg-white dark:bg-gray-900 rounded-xl border border-gray-300 dark:border-gray-700 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
                    {/* Barra de Navegador do Mockup */}
                    <div className="h-8 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center px-3 gap-2 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                      </div>
                      <div className="flex-1 max-w-xs mx-auto bg-white dark:bg-gray-900 h-5 rounded-md text-[10px] text-gray-400 flex items-center justify-center border border-gray-200 dark:border-gray-700">
                        sualoja.com.br
                      </div>
                    </div>

                    {/* Conteúdo Simulador Loja Desktop */}
                    <div className="flex-1 bg-slate-50 dark:bg-gray-950 p-6 relative flex flex-col justify-center overflow-hidden">
                      
                      {/* Flutuante Desktop */}
                      {activeTab === "floating" && (
                        <div className="absolute bottom-6 right-8 w-24 h-40 rounded-2xl overflow-hidden shadow-2xl group border-2" style={{ borderColor: primaryColor }}>
                          <img 
                            src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80" 
                            className="w-full h-full object-cover" 
                            alt="Preview"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                            <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
                              <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
                            </div>
                          </div>
                          <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold text-white uppercase tracking-wider" style={{ backgroundColor: accentColor }}>
                            Ao vivo
                          </div>
                        </div>
                      )}

                      {/* Carrossel / Carrossel Dinâmico Desktop (Linha ampla) */}
                      {(activeTab === "carousel" || activeTab === "dynamic_carousel") && (
                        <div className="w-full flex items-center justify-center gap-4 px-4">
                          <button className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          
                          {[1, 2, 3, 4].map((item) => (
                            <div 
                              key={item} 
                              className={`w-36 h-56 rounded-2xl overflow-hidden shadow-lg relative flex flex-col justify-between p-2.5 transition-all ${
                                item === 2 ? "scale-105 border-2 shadow-xl ring-2 ring-blue-500/20" : "opacity-85 border border-gray-200 dark:border-gray-800"
                              }`}
                              style={{ borderColor: item === 2 ? primaryColor : undefined }}
                            >
                              <img 
                                src={`https://images.unsplash.com/photo-${1515886657613 + item * 2000}?w=300&auto=format&fit=crop&q=80`} 
                                className="absolute inset-0 w-full h-full object-cover" 
                                alt="" 
                              />
                              <div className="relative z-10 w-full flex justify-center my-auto">
                                <div className="w-9 h-9 rounded-full bg-white/95 flex items-center justify-center shadow-md">
                                  <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                                </div>
                              </div>
                              <div className="relative z-10 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xs rounded-xl p-1.5 flex items-center gap-2 shadow">
                                <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&auto=format&fit=crop&q=80" className="w-7 h-7 rounded-lg object-cover" alt="" />
                                <div className="min-w-0">
                                  <div className="text-[10px] font-bold text-gray-800 dark:text-white truncate">Look Verão</div>
                                  <div className="text-[10px] font-extrabold" style={{ color: primaryColor }}>R$ 189,90</div>
                                </div>
                              </div>
                            </div>
                          ))}

                          <button className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      )}

                      {/* Grade Desktop */}
                      {activeTab === "grid" && (
                        <div className="grid grid-cols-4 gap-3 w-full max-w-3xl mx-auto">
                          {[1, 2, 3, 4].map((item) => (
                            <div key={item} className="h-44 rounded-2xl overflow-hidden bg-black relative border-2 shadow-sm" style={{ borderColor: primaryColor }}>
                              <img src={`https://images.unsplash.com/photo-${1515886657613 + item * 1000}?w=300&auto=format&fit=crop&q=80`} className="w-full h-full object-cover opacity-90" alt="" />
                              <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow">
                                  <Play className="w-3.5 h-3.5 fill-black text-black ml-0.5" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Player Desktop (Estilo Modal Centralizado) */}
                      {activeTab === "player" && (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="w-[300px] h-[95%] bg-black rounded-2xl overflow-hidden relative shadow-2xl flex flex-col justify-between p-3 border border-gray-700">
                            <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=500&auto=format&fit=crop&q=80" className="absolute inset-0 w-full h-full object-cover opacity-90" alt="" />
                            
                            <div className="relative z-10 flex items-center justify-between text-white">
                              <span className="text-[11px] font-bold drop-shadow">Vidlytics Store</span>
                              <X className="w-4 h-4 cursor-pointer" />
                            </div>

                            <div className="relative z-10 ml-auto flex flex-col items-center gap-2.5 text-white text-[10px]">
                              <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center">
                                <Heart className="w-3.5 h-3.5 fill-white" />
                              </div>
                              <div className="w-7 h-7 rounded-full bg-black/50 backdrop-blur-xs flex items-center justify-center">
                                <MessageCircle className="w-3.5 h-3.5" />
                              </div>
                            </div>

                            <div className="relative z-10 bg-white dark:bg-gray-900 rounded-xl p-2 flex items-center justify-between shadow-lg">
                              <div className="flex items-center gap-2">
                                <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&auto=format&fit=crop&q=80" className="w-8 h-8 rounded-lg object-cover" alt="" />
                                <div>
                                  <div className="text-[10px] font-bold text-gray-900 dark:text-white">Vestido Floral</div>
                                  <div className="text-[10px] font-extrabold" style={{ color: primaryColor }}>R$ 149,90</div>
                                </div>
                              </div>
                              <button className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm" style={{ backgroundColor: accentColor }}>
                                Comprar
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                ) : (
                  /* 2. MOCKUP MOBILE SLIM & CLEAN (Bordas Finas e Dynamic Island) */
                  <div className="w-[285px] h-[540px] rounded-[38px] border-[3px] border-slate-700/70 dark:border-slate-600 bg-black shadow-2xl ring-1 ring-white/10 relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    
                    {/* Dynamic Island Suave */}
                    <div className="w-20 h-4 bg-black rounded-full mx-auto absolute top-2 left-1/2 -translate-x-1/2 z-30 ring-1 ring-white/10 flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#111] mr-1"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-[#052e16]"></div>
                    </div>

                    {/* Tela do Celular */}
                    <div className="w-full h-full relative bg-[#090d16] flex flex-col justify-center items-center overflow-hidden">
                      
                      {/* Cenário: Flutuante */}
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

                      {/* Cenário: Carrossel / Carrossel Dinâmico */}
                      {(activeTab === "carousel" || activeTab === "dynamic_carousel") && (
                        <div className="w-full px-2 flex items-center justify-center gap-2">
                          <div className="w-12 h-20 rounded-xl opacity-40 overflow-hidden bg-black scale-90">
                            <img src="https://images.unsplash.com/photo-1526336024174-e58f5fadae20?w=200&auto=format&fit=crop&q=80" className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="w-36 h-56 rounded-2xl border-2 overflow-hidden shadow-2xl bg-black relative flex flex-col justify-between p-2" style={{ borderColor: primaryColor }}>
                            <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80" className="absolute inset-0 w-full h-full object-cover" alt="" />
                            <div className="relative z-10 w-full flex justify-center mt-auto mb-auto">
                              <div className="w-8 h-8 rounded-full bg-white/95 flex items-center justify-center shadow">
                                <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                              </div>
                            </div>
                            {/* Mini Card Produto no Story */}
                            <div className="relative z-10 bg-white/95 dark:bg-gray-900/95 rounded-xl p-1.5 flex items-center gap-2 shadow">
                              <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&auto=format&fit=crop&q=80" className="w-6 h-6 rounded-md object-cover" alt="" />
                              <div className="min-w-0">
                                <div className="text-[9px] font-bold text-gray-800 dark:text-white truncate">Look Verão</div>
                                <div className="text-[9px] font-extrabold" style={{ color: primaryColor }}>R$ 149,95</div>
                              </div>
                            </div>
                          </div>
                          <div className="w-12 h-20 rounded-xl opacity-40 overflow-hidden bg-black scale-90">
                            <img src="https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&auto=format&fit=crop&q=80" className="w-full h-full object-cover" alt="" />
                          </div>
                        </div>
                      )}

                      {/* Cenário: Grade */}
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

                      {/* Cenário: Player Interativo Completo */}
                      {activeTab === "player" && (
                        <div className="w-full h-full relative flex flex-col justify-between p-3 bg-black">
                          <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&auto=format&fit=crop&q=80" className="absolute inset-0 w-full h-full object-cover opacity-90" alt="" />
                          
                          {/* Top Header */}
                          <div className="relative z-10 flex items-center justify-between text-white pt-4">
                            <div className="flex items-center gap-1.5">
                              <div className="w-6 h-6 rounded-full border border-white/60 bg-black/40 flex items-center justify-center text-[10px]">V</div>
                              <div className="text-[10px] font-bold drop-shadow">Vidlytics Store</div>
                            </div>
                            <X className="w-4 h-4 cursor-pointer" />
                          </div>

                          {/* Right Action Icons */}
                          <div className="relative z-10 ml-auto flex flex-col items-center gap-3 text-white text-[10px]">
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                                <Heart className="w-3.5 h-3.5 fill-white" />
                              </div>
                              <span>1.2k</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                                <MessageCircle className="w-3.5 h-3.5" />
                              </div>
                              <span>48</span>
                            </div>
                            <div className="flex flex-col items-center">
                              <div className="w-7 h-7 rounded-full bg-black/40 backdrop-blur-xs flex items-center justify-center">
                                <Share2 className="w-3.5 h-3.5" />
                              </div>
                              <span>Enviar</span>
                            </div>
                          </div>

                          {/* Bottom Product Card */}
                          <div className="relative z-10 bg-white dark:bg-gray-900 rounded-xl p-2 flex items-center justify-between shadow-xl">
                            <div className="flex items-center gap-2">
                              <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&auto=format&fit=crop&q=80" className="w-8 h-8 rounded-lg object-cover" alt="" />
                              <div>
                                <div className="text-[10px] font-bold text-gray-900 dark:text-white">Vestido Floral</div>
                                <div className="text-[10px] font-extrabold" style={{ color: primaryColor }}>R$ 149,95</div>
                              </div>
                            </div>
                            <button className="px-2.5 py-1 text-[10px] font-bold text-white rounded-lg shadow-sm" style={{ backgroundColor: accentColor }}>
                              Comprar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Home bar inferior slim */}
                      <div className="w-24 h-1 bg-white/40 rounded-full mx-auto absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 text-xs shrink-0">
          <button
            type="button"
            onClick={() => {
              setStyleName("Estilo Padrão Vidlytics");
              setPrimaryColor(VIDLYTICS_BLUE);
              setAccentColor(VIDLYTICS_ORANGE);
              setIsDefault(true);
            }}
            className="px-3 py-1.5 text-rose-500 font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
          >
            Resetar
          </button>
          
          <div className="text-gray-400 hidden sm:block">
            <span>ℹ Este painel é um <strong>preview meramente visual</strong>. Para testar cliques e interações, use o simulador na edição dos stories.</span>
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
                accent_color: accentColor,
                use_all_devices: useAllDevices
              })}
              className="px-5 py-2 bg-[#0094eb] hover:bg-blue-600 text-white font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Salvar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
