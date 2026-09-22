import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Play, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  Eye, 
  HardDrive, 
  FileText, 
  Calendar, 
  Share2, 
  Copy, 
  Check, 
  ShoppingBag, 
  MessageSquare, 
  Palette, 
  BarChart2, 
  FolderOpen, 
  Headphones, 
  ChevronDown, 
  Layers, 
  ArrowLeft,
  Loader2,
  AlertCircle,
  Store as StoreIcon,
  PlusCircle
} from "lucide-react";
import { SLLDatabaseService } from "../services/SLLDatabaseService";

interface Store {
  id: string;
  name: string;
  slug?: string;
  url?: string;
  platform?: string;
  plan_id?: string;
  subscription_status?: string;
}

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [copiedLink, setCopiedLink] = useState(false);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);

  // Estados de Banco e Loja
  const [stores, setStores] = useState<Store[]>([]);
  const [activeStore, setActiveStore] = useState<Store | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [storeSelectOpen, setStoreSelectOpen] = useState<boolean>(false);

  // Estados preparados para consumo de API (Mock estruturado pronto para bind)
  const [salesData, setSalesData] = useState({
    paidSalesAmount: 0.00,
    paidOrdersCount: 0,
    pendingSalesAmount: 378.39,
    pendingOrdersCount: 3,
    affiliateAmount: 0.00,
  });

  const [planUsageData, setPlanUsageData] = useState({
    planName: "Scale",
    cycle: "Vitalício",
    viewsCurrent: 57,
    viewsLimit: 60000,
    viewsPercent: 1,
    storageCurrentMB: 10.3,
    storageLimitGB: 50,
    storagePercent: 2,
    pagesActive: 1,
    pagesLimit: 9999,
    pagesPercent: 5,
    isAppActive: true
  });

  // Busca inicial das lojas do usuário via SLLDatabaseService
  useEffect(() => {
    async function fetchStores() {
      setIsLoading(true);
      try {
        console.log("[Vidlytics] Carregando lojas via SLLDatabaseService...");
        // Suporta tanto getUserStores() quanto getStores() caso haja variações de interface
        const service = SLLDatabaseService as any;
        const result = service.getUserStores 
          ? await service.getUserStores() 
          : await service.getStores();

        const storeList: Store[] = Array.isArray(result) ? result : (result?.data || []);
        console.log("[Vidlytics] Lojas encontradas:", storeList);

        setStores(storeList);
        if (storeList.length > 0) {
          setActiveStore(storeList[0]);
        }
      } catch (error) {
        console.error("[Vidlytics] Erro ao carregar lojas do SLL:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchStores();
  }, []);

  const handleCopyLink = () => {
    const storeSlug = activeStore?.slug || "useanny";
    navigator.clipboard.writeText(`https://vidlytics.com.br/indique/${storeSlug}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const modules = [
    { name: "Vidlytics Stories", path: "/vidlytics", current: true },
    { name: "Live Commerce", path: "/live-commerce", current: false },
    { name: "Checkout Transparente", path: "/checkout", current: false },
    { name: "Consultor IA", path: "/consultor-ia", current: false },
    { name: "Prova Social", path: "/prova-social", current: false },
  ];

  const tabs = [
    { id: "overview", label: "Visão Geral", icon: BarChart2 },
    { id: "results", label: "Resultados", icon: DollarSign },
    { id: "stories", label: "Stories", icon: Play },
    { id: "library", label: "Biblioteca", icon: FolderOpen },
    { id: "products", label: "Produtos", icon: ShoppingBag },
    { id: "comments", label: "Comentários", icon: MessageSquare },
    { id: "appearance", label: "Aparência", icon: Palette },
  ];

  const checklistItems = [
    { title: "Configurações da loja", desc: "Preencha os dados cadastrais, e-mail e canais de contato." },
    { title: "Instalação do script", desc: "Copie o código e insira no seu e-commerce via GTM ou Head." },
    { title: "Vincular produtos", desc: "Vincule produtos à sua loja para conversão direta nos vídeos." },
    { title: "Subir vídeos", desc: "Adicione vídeos verticais ou importe por redes sociais." },
    { title: "Criar coleção", desc: "Agrupe seus vídeos em coleções interativas." },
    { title: "Aparência", desc: "Personalize cores, bordas e botões do player." },
  ];

  const activities = [
    { title: "Coleção de stories atualizada: TESTE", date: "16 de set. às 16:29" },
    { title: `Configurações da loja salvas: ${activeStore?.name || "Use Anny"}`, date: "15 de set. às 13:57" },
    { title: `Configurações da loja salvas: ${activeStore?.name || "Use Anny"}`, date: "15 de set. às 10:52" },
    { title: `Configurações da loja salvas: ${activeStore?.name || "Use Anny"}`, date: "10 de set. às 08:30" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-12 relative flex flex-col justify-between">
      <div>
        {/* 1. BARRA GLOBAL SLL HUB (Alinhada simetricamente na grade max-w-7xl) */}
        <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
            {/* Ícone SLL + Botão Voltar ao Hub */}
            <button 
              onClick={() => navigate("/")}
              className="flex items-center gap-2.5 group text-slate-600 hover:text-slate-900 transition-colors"
              title="Voltar ao Hub Central do SLL"
            >
              <img 
                src="/assets/sll-logotipo-ico.png" 
                alt="SLL" 
                className="h-8 w-8 object-contain transition-transform group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-x-0.5 transition-transform" />
                <span>Voltar ao Hub Central</span>
              </div>
            </button>

            {/* Dropdown / Seletor de Módulos */}
            <div className="relative">
              <button
                onClick={() => setModuleMenuOpen(!moduleMenuOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors shadow-xs"
              >
                <Layers className="w-3.5 h-3.5 text-[#0094eb]" />
                <span>Módulo: <strong>Vidlytics Stories</strong></span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {moduleMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400">Alternar Módulo SLL</div>
                  {modules.map((m, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setModuleMenuOpen(false);
                        if (!m.current) navigate(m.path);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
                        m.current 
                          ? "bg-blue-50 text-[#0094eb] font-bold" 
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>{m.name}</span>
                      {m.current && <span className="w-1.5 h-1.5 rounded-full bg-[#0094eb]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* CONTAINER DO CONTEÚDO PRINCIPAL */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 space-y-5">
          
          {/* 2. PROMO BANNER */}
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white p-6 sm:p-7 shadow-sm">
            <div className="relative z-10 max-w-2xl space-y-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold uppercase bg-[#fd8539] text-white tracking-wide shadow-sm">
                ✨ Turbine seu E-commerce
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold leading-tight">
                Transforme visitantes em clientes com Vídeos Curtos e Stories
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Seus produtos integrados diretamente nos vídeos interativos com conversão em tempo real.
              </p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-25 md:opacity-40 pointer-events-none hidden sm:block">
              <img 
                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80" 
                alt="Dashboard Analytics" 
                className="h-full w-full object-cover object-left"
              />
            </div>
          </section>

          {/* 3. BARRA DO MÓDULO VIDLYTICS (Logo + Abas) */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 pl-2">
                <img 
                  src="/assets/vidlytics-logo-wide.png" 
                  alt="Vidlytics" 
                  className="h-7 sm:h-8 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              </div>

              {/* Abas */}
              <nav className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? "bg-[#0094eb] text-white shadow-sm shadow-[#0094eb]/20"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200/80"
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </section>

          {/* 4. BARRA DE STATUS DINÂMICA COM DADOS REAIS DA LOJA */}
          <section className="bg-white rounded-xl px-4 py-2 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              {isLoading ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0094eb]" />
                  <span>Carregando dados da loja...</span>
                </div>
              ) : activeStore ? (
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <button
                      onClick={() => stores.length > 1 && setStoreSelectOpen(!storeSelectOpen)}
                      className={`flex items-center gap-1.5 font-bold text-slate-800 text-xs sm:text-sm hover:text-[#0094eb] transition-colors ${
                        stores.length > 1 ? "cursor-pointer" : "cursor-default"
                      }`}
                    >
                      <span>Olá, <strong>{activeStore.name}</strong></span>
                      {stores.length > 1 && <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
                    </button>

                    {/* Menu se houver mais de uma loja cadastrada */}
                    {storeSelectOpen && (
                      <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                        <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400">Suas Lojas</div>
                        {stores.map((st) => (
                          <button
                            key={st.id}
                            onClick={() => {
                              setActiveStore(st);
                              setStoreSelectOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${
                              activeStore.id === st.id ? "text-[#0094eb] font-bold bg-blue-50/50" : "text-slate-700"
                            }`}
                          >
                            <span>{st.name}</span>
                            {activeStore.id === st.id && <Check className="w-3.5 h-3.5 text-[#0094eb]" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="h-3 w-px bg-slate-200" />
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-50 text-[#0094eb] border border-blue-100">
                    Plano {planUsageData.planName}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-50 text-purple-600 border border-purple-100">
                    Acesso {planUsageData.cycle}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  <span>Nenhuma loja selecionada</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 px-2.5 py-0.5 rounded-md text-[11px]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
              <span className="font-bold uppercase tracking-wider">Aplicativo Ativado:</span>
              <span className="text-emerald-600 hidden md:inline">Seus vídeos estão online no seu e-commerce</span>
            </div>
          </section>

          {/* TRATAMENTO DE EMPTY STATE OU EXIBIÇÃO NORMAL */}
          {!isLoading && stores.length === 0 ? (
            /* Card Informativo Amigável quando não há loja cadastrada */
            <div className="bg-white rounded-2xl p-10 border border-slate-200/90 shadow-xs text-center space-y-4 max-w-2xl mx-auto my-8">
              <div className="w-14 h-14 rounded-full bg-blue-50 text-[#0094eb] flex items-center justify-center mx-auto">
                <StoreIcon className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-800">Nenhuma loja cadastrada no seu usuário</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                  Para utilizar o Vidlytics Stories e acompanhar métricas de faturamento e visualizações, cadastre sua loja ou vincule seu domínio principal no Hub SLL.
                </p>
              </div>
              <div className="pt-2 flex justify-center gap-3">
                <button
                  onClick={() => navigate("/")}
                  className="px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Cadastrar Loja no Hub</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* 5. SEÇÃO RESULTADOS DE VENDAS */}
              <div>
                <h2 className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2.5">
                  Resultados de Vendas Vindas dos Vídeos
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-slate-500">Vendas Pagas</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100">
                          {salesData.paidOrdersCount} Pedidos
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {salesData.paidSalesAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                      <div className="text-[11px] text-slate-400">Faturamento confirmado via vídeos</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-slate-500">Aguardando Pagamento</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-50 text-amber-600 border border-amber-100">
                          {salesData.pendingOrdersCount} Pedidos
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {salesData.pendingSalesAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                      <div className="text-[11px] text-slate-400">Pix / Boleto pendente</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-slate-500">Faturamento Indicações</span>
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-50 text-[#0094eb] border border-blue-100">
                          Comissões
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">
                        {salesData.affiliateAmount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </div>
                      <div className="text-[11px] text-slate-400">Ver detalhes no Indica & Ganha →</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0094eb]">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 6. CONSUMO DO PLANO */}
              <div>
                <h2 className="text-[11px] font-bold tracking-wider uppercase text-slate-400 mb-2.5">
                  Consumo do Plano
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Visualizações</span>
                      <Eye className="w-4 h-4 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">{planUsageData.viewsCurrent}</span>
                        <span className="text-xs text-slate-400">de {planUsageData.viewsLimit.toLocaleString("pt-BR")}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-[#0094eb] h-1.5 rounded-full" style={{ width: `${planUsageData.viewsPercent}%` }} />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Quota do mês</span>
                      <span>{planUsageData.viewsPercent}%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Armazenamento</span>
                      <HardDrive className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">{planUsageData.storageCurrentMB} MB</span>
                        <span className="text-xs text-slate-400">de {planUsageData.storageLimitGB} GB</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${planUsageData.storagePercent}%` }} />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Vídeos na nuvem</span>
                      <span>{planUsageData.storagePercent}%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Páginas com Vídeos</span>
                      <FileText className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">{planUsageData.pagesActive}</span>
                        <span className="text-xs text-slate-400">de {planUsageData.pagesLimit} ativas</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-[#fd8539] h-1.5 rounded-full" style={{ width: `${planUsageData.pagesPercent}%` }} />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Locais de exibição</span>
                      <span>{planUsageData.pagesPercent}%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Ciclo da Conta</span>
                      <Calendar className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
                      <div className="text-xl font-black text-slate-900">{planUsageData.cycle}</div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Renovação:</span>
                      <span>— (sem vencimento)</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 7. CHECKLIST E ATIVIDADE RECENTE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Checklist */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">Checklist da Ativação da Loja</h3>
                  <p className="text-xs text-slate-400">Conclua os passos para publicar seus stories.</p>
                </div>
                <span className="px-2.5 py-1 text-xs font-black rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  100%
                </span>
              </div>

              <div className="space-y-3 pt-1">
                {checklistItems.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white flex-shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-800">{item.title}</h4>
                      <p className="text-[11px] text-slate-500 leading-tight">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Atividade Recente */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900">Atividade Recente (Log do Painel)</h3>
                <p className="text-xs text-slate-400">Histórico em tempo real de alterações e atividades do usuário.</p>
              </div>

              <div className="flex-1 overflow-y-auto max-h-[390px] space-y-2.5 pr-2 scrollbar-thin scrollbar-thumb-slate-200">
                {activities.map((act, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
                    <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-purple-600 flex-shrink-0">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{act.title}</p>
                      <p className="text-[10px] text-slate-400">{act.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 8. ACADEMY & INDIQUE E GANHE */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vidlytics Academy */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center gap-5">
              <div className="relative w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center flex-shrink-0 group cursor-pointer shadow-inner">
                <div className="w-10 h-10 rounded-full bg-white/90 text-[#0094eb] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                </div>
              </div>
              <div className="space-y-1.5 text-center sm:text-left">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  💎 Vidlytics Academy
                </span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  Como dobrar suas conversões com vídeos em 3 passos
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Aprenda as melhores práticas de posicionamento e gatilhos de CTA para aumentar as vendas da sua loja.
                </p>
              </div>
            </div>

            {/* Indique e Ganhe */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-[#0094eb] flex items-center justify-center">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Indique e Ganhe</h3>
                  </div>
                  <Share2 className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-500">
                  Receba comissões e desbloqueie meses gratuitos ao indicar o Vidlytics para outros lojistas.
                </p>
              </div>

              <div className="space-y-2">
                <button 
                  onClick={handleCopyLink}
                  className="w-full py-2.5 px-4 bg-[#0094eb] hover:bg-[#0082cf] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm shadow-[#0094eb]/20"
                >
                  {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedLink ? "LINK COPIADO!" : "COPIAR MEU LINK DE INDICAÇÃO"}
                </button>
                <div className="text-center">
                  <button className="text-[11px] font-semibold text-slate-500 hover:text-[#0094eb] transition-colors">
                    Acessar painel de indicações →
                  </button>
                </div>
              </div>
            </div>
          </div>

        </main>
      </div>

      {/* 9. RODAPÉ INSTITUCIONAL */}
      <footer className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-10 mt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
        <p>© 2026 Vidlytics Stories. Todos os direitos reservados.</p>
        <div className="flex items-center gap-3">
          <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400">DESENVOLVIDO POR:</span>
          <img 
            src="/assets/sll-logotipo.png" 
            alt="Sistema Loja Lucrativa" 
            className="h-9 sm:h-10 object-contain hover:opacity-90 transition-opacity"
            onError={(e) => {
              const target = e.target as HTMLElement;
              target.style.display = "none";
            }} 
          />
        </div>
      </footer>

      {/* 10. ÍCONE DE SUPORTE FLUTUANTE */}
      <aside aria-label="Suporte" className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => alert("Canal de Suporte SLL")}
          className="w-12 h-12 rounded-full bg-[#0094eb] hover:bg-[#0082cf] text-white flex items-center justify-center shadow-lg shadow-[#0094eb]/30 transition-transform hover:scale-105 active:scale-95"
          title="Falar com o Suporte"
        >
          <Headphones className="w-6 h-6" />
        </button>
      </aside>
    </div>
  );
}
