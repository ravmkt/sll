import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  PlaySquare, 
  Film, 
  ShoppingBag, 
  MessageSquare, 
  Palette, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Eye, 
  HardDrive, 
  Layers, 
  Calendar,
  Sparkles
} from "lucide-react";
import SLLDatabaseService, { Store } from "../services/SLLDatabaseService";

export type VidlyticsTab = 
  | "overview" 
  | "results" 
  | "stories" 
  | "library" 
  | "products" 
  | "comments" 
  | "appearance";

const SLL_MODULES = [
  { id: "vidlytics", name: "Vidlytics", path: "/vidlytics" },
  { id: "hub", name: "Hub Central SLL", path: "/" },
  { id: "live_commerce", name: "Live Commerce", path: "/live-commerce" },
  { id: "pdv", name: "PDV Integrado", path: "/pdv" },
  { id: "ia_consultant", name: "Consultor IA", path: "/ia-consultant" },
  { id: "social_proof", name: "Prova Social", path: "/social-proof" },
  { id: "pricing_pro", name: "Precificação PRO", path: "/pricing" },
  { id: "whatsapp_ai", name: "Atendimento WhatsApp IA", path: "/whatsapp" }
];

export const Vidlytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<VidlyticsTab>("overview");
  const [selectedModule, setSelectedModule] = useState("vidlytics");
  const [currentStore, setCurrentStore] = useState<Store | null>(null);

  useEffect(() => {
    async function loadStores() {
      try {
        const stores = await SLLDatabaseService.getStores();
        if (stores && stores.length > 0) {
          setCurrentStore(stores[0]);
        } else {
          setCurrentStore({
            id: "store-demo",
            name: "Lojista",
            owner_user_id: "demo"
          });
        }
      } catch (e) {
        console.error("Erro ao carregar lojas:", e);
      }
    }
    loadStores();
  }, []);

  const handleModuleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedModule(val);
    const mod = SLL_MODULES.find((m) => m.id === val);
    if (mod && val !== "vidlytics") {
      window.location.href = mod.path;
    }
  };

  const navTabs: { id: VidlyticsTab; label: string }[] = [
    { id: "overview", label: "Visão Geral" },
    { id: "results", label: "Resultados" },
    { id: "stories", label: "Stories" },
    { id: "library", label: "Biblioteca" },
    { id: "products", label: "Produtos" },
    { id: "comments", label: "Comentários" },
    { id: "appearance", label: "Aparência" },
  ];

  return (
    <div className="min-h-screen bg-[#f1f5f9] text-slate-800 flex flex-col font-sans">
      
      {/* 1. FAIXA SUPERIOR GLOBAL SLL (Conforme o mockup) */}
      <div className="bg-[#fcf8f3] border-b border-[#f0e8de] px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Logo Sistema Loja Lucrativa */}
          <a href="/" className="flex items-center gap-2 group cursor-pointer transition-transform active:scale-95">
            <div className="w-8 h-8 rounded-lg bg-[#fd8539] flex items-center justify-center text-white shadow-sm shadow-[#fd8539]/30">
              🛒
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[#0094eb] font-extrabold text-sm tracking-tight">Sistema</span>
              <span className="text-[#fd8539] font-extrabold text-xs tracking-tight">Loja Lucrativa</span>
            </div>
          </a>

          {/* Select de Módulos estilo pílula azul suave */}
          <div className="relative">
            <select
              value={selectedModule}
              onChange={handleModuleChange}
              className="appearance-none bg-[#e8f2fa] border border-[#bcdbf3] text-[#0070b8] font-bold text-xs rounded-full px-4 py-1.5 pr-8 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/40 cursor-pointer shadow-inner"
            >
              {SLL_MODULES.map((mod) => (
                <option key={mod.id} value={mod.id}>
                  {mod.name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#0094eb]">
              <span className="text-[10px]">▼</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 hidden md:block font-medium">
          Loja Ativa: <span className="font-bold text-slate-700">{currentStore?.name || "Minha Loja"}</span>
        </div>
      </div>

      {/* 2. SUB-FAIXA VIDLYTICS + ABAS EM PÍLULA (Conforme o mockup) */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          
          {/* Logo Vidlytics */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#0094eb] to-[#00b4d8] flex items-center justify-center shadow-sm text-white font-black text-sm">
              ▶
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Vid<span className="text-[#0094eb]">lytics</span>
            </span>
          </div>

          {/* Pílulas de Navegação */}
          <div className="flex flex-wrap items-center gap-2">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                    isActive
                      ? "bg-[#0094eb] text-white shadow-[#0094eb]/30 hover:bg-[#0082cf]"
                      : "bg-[#0094eb]/10 text-[#0073b6] hover:bg-[#0094eb]/20"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. BANNER PANORÂMICO (Apenas na aba Visão Geral) */}
      {activeTab === "overview" && (
        <div className="w-full bg-[#1e293b] border-b border-slate-300 relative overflow-hidden">
          <div className="max-w-7xl mx-auto relative h-56 md:h-72 w-full flex items-center justify-between px-6">
            
            {/* Texto Promocional sobreposto no Banner */}
            <div className="relative z-10 max-w-xl text-white py-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-[#fd8539] text-white shadow-md mb-2">
                <Sparkles className="w-3.5 h-3.5" /> TURBINE SEU E-COMMERCE
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-white leading-tight drop-shadow-sm">
                Transforme visitantes em clientes com Vídeos Curtos e Stories
              </h2>
              <p className="text-xs md:text-sm text-slate-200 mt-2 font-medium drop-shadow-sm">
                Seus produtos integrados diretamente nos vídeos interativos com conversão em tempo real.
              </p>
            </div>

            {/* Imagem / Mockup Banner Panorâmico */}
            <div className="absolute right-0 inset-y-0 w-full md:w-3/5 h-full opacity-40 md:opacity-100 flex items-center justify-end pointer-events-none">
              <img 
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80" 
                alt="E-commerce Analytics Banner" 
                className="h-full w-full object-cover object-center mask-radial"
                style={{ maskImage: "linear-gradient(to right, transparent, black 40%)", WebkitMaskImage: "linear-gradient(to right, transparent, black 40%)" }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. CONTEÚDO PRINCIPAL (Cards de Métricas e Dashboards) */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 flex-1 space-y-6">
        {activeTab === "overview" && (
          <>
            {/* Bloco 1: Resultados de Vendas Vindas dos Vídeos */}
            <div>
              <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3">
                Resultados de Vendas Vindas dos Vídeos
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Vendas Pagas */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Vendas Pagas</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 font-extrabold px-2 py-0.5 rounded-full">
                        0 Pedidos
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">R$ 0,00</div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Faturamento confirmado via vídeos</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                {/* Aguardando Pagamento */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Aguardando Pagamento</span>
                      <span className="text-[10px] bg-amber-100 text-amber-700 font-extrabold px-2 py-0.5 rounded-full">
                        0 Pedidos
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">R$ 0,00</div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Pix / Boletos em aberto</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                {/* Indicações Vidlytics */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase">Indicações Vidlytics</span>
                      <span className="text-[10px] bg-blue-100 text-[#0094eb] font-extrabold px-2 py-0.5 rounded-full">
                        Comissões
                      </span>
                    </div>
                    <div className="text-2xl font-black text-slate-900 mt-2">R$ 0,00</div>
                    <p className="text-[11px] text-slate-400 font-medium mt-1">Recompensas de indicação</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 2: Consumo do Plano */}
            <div>
              <h3 className="text-xs font-black tracking-wider text-slate-400 uppercase mb-3">
                Consumo do Plano
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Visualizações */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold text-slate-500 uppercase">Visualizações</span>
                    <Eye className="w-4 h-4 text-[#0094eb]" />
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl font-black text-slate-900">0</span>
                    <span className="text-xs text-slate-400 font-medium">de 10.000</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                    <div className="bg-[#0094eb] h-full rounded-full" style={{ width: "0%" }}></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-2">
                    <span>Quota do mês</span>
                    <span>0%</span>
                  </div>
                </div>

                {/* Armazenamento */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold text-slate-500 uppercase">Armazenamento</span>
                    <HardDrive className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl font-black text-slate-900">120 MB</span>
                    <span className="text-xs text-slate-400 font-medium">de 2 GB</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: "6%" }}></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-2">
                    <span>Vídeos na nuvem</span>
                    <span>6%</span>
                  </div>
                </div>

                {/* Páginas com Vídeos */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold text-slate-500 uppercase">Páginas com Vídeos</span>
                    <Layers className="w-4 h-4 text-[#fd8539]" />
                  </div>
                  <div className="flex items-baseline justify-between mt-3">
                    <span className="text-2xl font-black text-slate-900">1</span>
                    <span className="text-xs text-slate-400 font-medium">de 5 ativas</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-3">
                    <div className="bg-[#fd8539] h-full rounded-full" style={{ width: "20%" }}></div>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-2">
                    <span>Locais de exibição</span>
                    <span>20%</span>
                  </div>
                </div>

                {/* Ciclo da Conta */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col justify-between">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-xs font-bold text-slate-500 uppercase">Ciclo da Conta</span>
                    <Calendar className="w-4 h-4 text-[#0094eb]" />
                  </div>
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                    <span className="text-base font-extrabold text-slate-900">Assinatura Ativa</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-400 font-medium mt-4 pt-2 border-t border-slate-100">
                    <span>Módulo:</span>
                    <span className="text-[#0094eb] font-bold">Vidlytics SaaS</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bloco 3: Checklist & Atividade Recente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">Checklist de Publicação</h4>
                    <p className="text-xs text-slate-400 mt-0.5">Conclua os passos para rodar seus stories na loja.</p>
                  </div>
                  <span className="text-xs font-bold text-slate-400">0%</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-6 h-6 rounded-full border-2 border-slate-300 text-slate-400 flex items-center justify-center text-xs font-bold">
                      1
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Subir vídeos</p>
                      <p className="text-[11px] text-slate-400">Suba seus vídeos verticais ou importe do Instagram/TikTok.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
                <h4 className="font-extrabold text-slate-900 text-sm mb-1">Atividade Recente (Log do Módulo)</h4>
                <p className="text-xs text-slate-400 mb-6">Histórico em tempo real das ações no Vidlytics.</p>
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma atividade recente registrada neste módulo.
                </div>
              </div>
            </div>
          </>
        )}

        {/* Placeholders para outras Abas */}
        {activeTab !== "overview" && (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center shadow-sm">
            <h3 className="text-xl font-black text-slate-900 capitalize mb-2">
              Aba: {activeTab}
            </h3>
            <p className="text-sm text-slate-500">
              O layout com abas superiores e faixas SLL está sincronizado perfeitamente.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Vidlytics;
