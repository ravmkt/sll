import React, { useState } from "react";
import BibliotecaTab from '../../pages/vidlytics/tabs/BibliotecaTab';
import { 
  LayoutDashboard, 
  BarChart3, 
  PlaySquare, 
  Film, 
  ShoppingBag, 
  MessageSquare, 
  Palette, 
  Code,
  Layers,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import PromoBanner from "./PromoBanner";

export type VidlyticsTab = 
  | "overview" 
  | "results" 
  | "stories" 
  | "library" 
  | "products" 
  | "comments" 
  | "appearance" 
  | "gtm";

interface VidlyticsLayoutProps {
  currentStoreName?: string;
  activeTab: VidlyticsTab;
  onTabChange: (tab: VidlyticsTab) => void;
  children: React.ReactNode;
}

const SLL_MODULES = [
  { id: "hub", name: "Painel Central SLL", path: "/" },
  { id: "vidlytics", name: "Vidlytics (Shoppable Video)", path: "/vidlytics" },
  { id: "live_commerce", name: "Live Commerce", path: "/live-commerce" },
  { id: "pdv", name: "PDV Integrado", path: "/pdv" },
  { id: "ia_consultant", name: "Consultor IA", path: "/ia-consultant" },
  { id: "social_proof", name: "Prova Social", path: "/social-proof" },
  { id: "pricing_pro", name: "Precificação PRO", path: "/pricing" },
  { id: "whatsapp_ai", name: "Atendimento WhatsApp IA", path: "/whatsapp" }
];

export const VidlyticsLayout: React.FC<VidlyticsLayoutProps> = ({
  currentStoreName = "Minha Loja",
  activeTab,
  onTabChange,
  children
}) => {
  const [selectedModule, setSelectedModule] = useState("vidlytics");

  const tabs: { id: VidlyticsTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "overview", label: "Visão Geral", icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: "results", label: "Resultados", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "stories", label: "Stories", icon: <PlaySquare className="w-4 h-4" /> },
    { id: "library", label: "Biblioteca de Vídeos", icon: <Film className="w-4 h-4" /> },
    { id: "products", label: "Produtos", icon: <ShoppingBag className="w-4 h-4" /> },
    { id: "comments", label: "Comentários", icon: <MessageSquare className="w-4 h-4" /> },
    { id: "appearance", label: "Aparência", icon: <Palette className="w-4 h-4" /> },
    { id: "gtm", label: "Integração GTM", icon: <Code className="w-4 h-4" /> }
  ];

  const handleModuleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedModule(val);
    const mod = SLL_MODULES.find((m) => m.id === val);
    if (mod && val !== "vidlytics") {
      window.location.href = mod.path;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col">
      {/* 1. TOP BAR GLOBAL DO SLL */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Lado Esquerdo: Logo SLL + Breadcrumb */}
          <div className="flex items-center space-x-3">
            <a 
              href="/" 
              title="Voltar ao Dashboard Geral do SLL" 
              className="flex items-center gap-2 group transition-opacity hover:opacity-90"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0094eb] to-[#fd8539] flex items-center justify-center shadow-sm">
                <span className="text-white font-black text-lg tracking-wider">S</span>
              </div>
              <div>
                <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1">
                  SLL <span className="text-[#0094eb] font-semibold text-xs tracking-normal">HUB</span>
                </span>
                <span className="text-[10px] text-slate-400 block -mt-1 font-medium">Sistema Loja Lucrativa</span>
              </div>
            </a>

            <ChevronRight className="w-4 h-4 text-slate-300 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2 bg-slate-100/70 border border-slate-200/60 px-2.5 py-1 rounded-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-semibold text-slate-700">{currentStoreName}</span>
            </div>
          </div>

          {/* Lado Direito: Seletor Rápido de Módulos + Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#0094eb]/30 transition-all">
              <Layers className="w-4 h-4 text-[#0094eb]" />
              <select
                value={selectedModule}
                onChange={handleModuleSelect}
                className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer pr-2"
              >
                {SLL_MODULES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <a
              href="/"
              className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#0094eb] transition-colors px-2 py-1"
            >
              Dashboard Geral
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* 2. BARRA DE NAVEGAÇÃO EM ABAS (HORIZONTAL TABS) */}
        <div className="border-t border-slate-100 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-2">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-[#0094eb] text-white shadow-sm shadow-[#0094eb]/25"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100/80"
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive ? "bg-white/25 text-white" : "bg-slate-200 text-slate-700"
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* 3. CONTEÚDO PRINCIPAL COM BANNER CONDICIONAL */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* BANNER CONDICIONAL: Só renderiza se for a aba "Visão Geral" */}
        {activeTab === "overview" && (
          <PromoBanner onActionClick={() => (window.location.href = "/ia-consultant")} />
        )}

        {/* ÁREA DINÂMICA DO CONTEÚDO DA ABA */}
        <div className="w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default VidlyticsLayout;

