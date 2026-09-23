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
  Eye, 
  Grid3X3, 
  ShoppingBag,
  Heart,
  MessageCircle,
  Share2
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
  
  // Estados do estilo
  const [styleName, setStyleName] = useState(initialData?.name || "Novo Estilo");
  const [isDefault, setIsDefault] = useState(initialData?.is_default || false);
  const [useAllDevices, setUseAllDevices] = useState(false);
  const [primaryColor, setPrimaryColor] = useState(initialData?.primary_color || "#0094EB");

  // Accordions abertos/fechados
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* Header do Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {initialData?.id ? "Editar Estilo" : "Criar Novo Estilo"}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas Superiores */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto bg-gray-50/50 dark:bg-gray-900/50">
          <button
            type="button"
            onClick={() => setActiveTab("basic")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === "basic"
                ? "bg-[#0094eb] text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" /> Básico
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("floating")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === "floating"
                ? "bg-[#0094eb] text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Flutuante
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("carousel")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === "carousel"
                ? "bg-[#0094eb] text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Carrossel
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("dynamic_carousel")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === "dynamic_carousel"
                ? "bg-[#0094eb] text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Carrossel Dinâmico
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("grid")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === "grid"
                ? "bg-[#0094eb] text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <Grid3X3 className="w-3.5 h-3.5" /> Grade
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("player")}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
              activeTab === "player"
                ? "bg-[#0094eb] text-white shadow-sm"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
            }`}
          >
            <Play className="w-3.5 h-3.5" /> Player
          </button>
        </div>

        {/* Corpo do Modal: Split 2 Colunas */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Coluna Esquerda: Configurações */}
          <div className="lg:col-span-5 bg-white dark:bg-gray-800/60 rounded-xl border border-gray-200/80 dark:border-gray-700 p-4 space-y-4">
            
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
                    placeholder="Ex: Estilo padrão"
                    className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-[#0094eb]"
                  />
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Definir como padrão</div>
                    <div className="text-[11px] text-gray-400">Estilo aplicado automaticamente na loja</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 text-[#0094eb] rounded border-gray-300"
                  />
                </div>

                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-gray-800 dark:text-gray-200">Usar aparência em todos os dispositivos</div>
                    <div className="text-[11px] text-gray-400">Aplica configurações de Desktop no Mobile</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={useAllDevices}
                    onChange={(e) => setUseAllDevices(e.target.checked)}
                    className="w-4 h-4 text-[#0094eb] rounded border-gray-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Cor Principal (Accent)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs font-mono bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg uppercase"
                    />
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

                {/* Alternador Desktop / Mobile do Form */}
                <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Dispositivo</span>
                  <div className="flex bg-gray-200 dark:bg-gray-800 p-0.5 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => setDevice("desktop")}
                      className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-all ${
                        device === "desktop" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500"
                      }`}
                    >
                      <Monitor className="w-3 h-3" /> Desktop
                    </button>
                    <button
                      type="button"
                      onClick={() => setDevice("mobile")}
                      className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 transition-all ${
                        device === "mobile" ? "bg-[#0094eb] text-white shadow-xs" : "text-gray-500"
                      }`}
                    >
                      <Smartphone className="w-3 h-3" /> Mobile
                    </button>
                  </div>
                </div>

                {/* Accordions de Configurações */}
                {[
                  { id: "1", title: "1. Layout & Dimensões" },
                  { id: "2", title: "2. Bordas & Arredondamento" },
                  { id: "3", title: "3. Elementos Visíveis" },
                  { id: "4", title: "4. Destaque de Vídeo" },
                  { id: "5", title: "5. Card de Produto" },
                ].map((sec) => (
                  <div key={sec.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                    <button
                      type="button"
                      onClick={() => toggleSection(sec.id)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <span>{sec.title}</span>
                      <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openSections[sec.id] ? "rotate-180" : ""}`} />
                    </button>
                    {openSections[sec.id] && (
                      <div className="p-3 text-xs border-t border-gray-100 dark:border-gray-800 text-gray-500 space-y-2">
                        <div className="flex items-center justify-between">
                          <span>Largura do Widget</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200">80px</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Espaçamento</span>
                          <span className="font-mono text-gray-800 dark:text-gray-200">12px</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Mostrar Ícone de Play</span>
                          <input type="checkbox" defaultChecked className="w-3.5 h-3.5 text-[#0094eb]" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coluna Direita: Preview Smartphone */}
          <div className="lg:col-span-7 bg-gray-50/70 dark:bg-gray-950/40 rounded-2xl border border-gray-200/60 dark:border-gray-800 p-6 flex flex-col items-center justify-center relative min-h-[500px]">
            
            {/* Controles de visualização de tela */}
            <div className="absolute top-4 right-4 flex items-center bg-gray-900 text-white rounded-lg p-1 shadow-sm">
              <button 
                onClick={() => setDevice("desktop")} 
                className={`p-1.5 rounded ${device === "desktop" ? "bg-[#fd8539] text-white" : "text-gray-400 hover:text-white"}`}
                title="Visualizar Desktop"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setDevice("mobile")} 
                className={`p-1.5 rounded ${device === "mobile" ? "bg-[#fd8539] text-white" : "text-gray-400 hover:text-white"}`}
                title="Visualizar Mobile"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Mockup do Aparelho Smartphone */}
            {activeTab === "basic" ? (
              <div className="bg-white dark:bg-gray-900 border border-dashed border-gray-300 dark:border-gray-700 rounded-2xl p-8 max-w-sm text-center space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Identificação</span>
                <h4 className="text-xl font-extrabold text-gray-900 dark:text-white">{styleName || "Nome do Estilo"}</h4>
                <div className="flex items-center justify-center gap-4 py-4 text-gray-400">
                  <div className="flex flex-col items-center gap-1">
                    <Monitor className="w-7 h-7" />
                    <span className="text-[10px]">DESKTOP</span>
                  </div>
                  <span className="text-xs text-gray-300">----------</span>
                  <div className="flex flex-col items-center gap-1">
                    <Smartphone className="w-7 h-7" />
                    <span className="text-[10px]">MOBILE</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {useAllDevices 
                    ? "Configuração unificada: O Mobile seguirá as mesmas diretrizes do Desktop."
                    : "Configuração independente: Personalize aparências diferentes para Desktop e Mobile."}
                </p>
              </div>
            ) : (
              <div className="w-[280px] h-[520px] bg-[#0c101a] rounded-[42px] border-[6px] border-[#222736] shadow-2xl relative overflow-hidden flex flex-col">
                {/* Notch / Speaker */}
                <div className="w-24 h-4 bg-[#222736] rounded-b-xl mx-auto absolute top-0 left-1/2 -translate-x-1/2 z-30" />

                {/* Conteúdo dentro da tela do celular */}
                <div className="w-full h-full relative bg-[#090d16] flex flex-col justify-center items-center overflow-hidden">
                  
                  {/* Cenário: Flutuante */}
                  {activeTab === "floating" && (
                    <div className="absolute bottom-5 right-4 w-14 h-24 rounded-xl border-2 border-[#0094eb] overflow-hidden shadow-lg bg-black group">
                      <img 
                        src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80" 
                        className="w-full h-full object-cover" 
                        alt="Preview"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <div className="w-5 h-5 rounded-full bg-white/90 flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 fill-black text-black ml-0.5" />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cenário: Carrossel / Carrossel Dinâmico */}
                  {(activeTab === "carousel" || activeTab === "dynamic_carousel") && (
                    <div className="w-full px-2 flex items-center justify-center gap-2">
                      <div className="w-12 h-20 rounded-lg opacity-40 overflow-hidden bg-black scale-90">
                        <img src="https://images.unsplash.com/photo-1526336024174-e58f5fadae20?w=200&auto=format&fit=crop&q=80" className="w-full h-full object-cover" alt="" />
                      </div>
                      <div className="w-36 h-56 rounded-xl border-2 border-[#0094eb] overflow-hidden shadow-2xl bg-black relative flex flex-col justify-between p-2">
                        <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=300&auto=format&fit=crop&q=80" className="absolute inset-0 w-full h-full object-cover" alt="" />
                        <div className="relative z-10 w-full flex justify-center mt-auto mb-auto">
                          <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow">
                            <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                          </div>
                        </div>
                        {/* Mini Card Produto no Story */}
                        <div className="relative z-10 bg-white/95 rounded-lg p-1.5 flex items-center gap-2 shadow">
                          <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=80&auto=format&fit=crop&q=80" className="w-6 h-6 rounded object-cover" alt="" />
                          <div className="min-w-0">
                            <div className="text-[9px] font-bold text-gray-800 truncate">Calça Confort</div>
                            <div className="text-[9px] font-extrabold text-[#0094eb]">R$ 149,95</div>
                          </div>
                        </div>
                      </div>
                      <div className="w-12 h-20 rounded-lg opacity-40 overflow-hidden bg-black scale-90">
                        <img src="https://images.unsplash.com/photo-1551028719-00167b16eac5?w=200&auto=format&fit=crop&q=80" className="w-full h-full object-cover" alt="" />
                      </div>
                    </div>
                  )}

                  {/* Cenário: Grade */}
                  {activeTab === "grid" && (
                    <div className="grid grid-cols-2 gap-2 p-3 w-full">
                      {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="h-32 rounded-xl border border-[#0094eb] overflow-hidden bg-black relative">
                          <img src={`https://images.unsplash.com/photo-${1515886657613 + item * 1000}?w=200&auto=format&fit=crop&q=80`} className="w-full h-full object-cover" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
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
                      <div className="relative z-10 flex items-center justify-between text-white pt-2">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full border border-white/60 bg-black/40 flex items-center justify-center text-[10px]">L</div>
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
                            <div className="text-[10px] font-bold text-gray-900 dark:text-white">Calça Confort...</div>
                            <div className="text-[10px] font-extrabold text-[#0094eb]">R$ 149,95</div>
                          </div>
                        </div>
                        <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" />
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 text-xs">
          <button
            type="button"
            onClick={() => {}}
            className="px-3 py-1.5 text-rose-500 font-bold uppercase tracking-wider hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
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
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => onSave({ name: styleName, is_default: isDefault, primary_color: primaryColor })}
              className="px-5 py-2 bg-[#0094eb] hover:bg-blue-600 text-white font-semibold rounded-xl shadow-sm transition-colors"
            >
              Salvar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
