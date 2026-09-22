import React, { useState } from "react";
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
  Search,
  RefreshCw,
  Sparkles,
  Zap,
  TrendingDown,
  LogOut,
  HelpCircle,
  Compass,
  Heart,
  Percent,
  Video,
  Plus,
  Send,
  Sliders,
  Edit2,
  Trash2,
  Save,
  MousePointer,
  Crosshair,
  Globe,
  UploadCloud,
  Link2,
  Instagram,
  Music2,
  Download,
  Image as ImageIcon,
  X
} from "lucide-react";

export default function Vidlytics() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("library");
  const [copiedLink, setCopiedLink] = useState(false);
  const [moduleMenuOpen, setModuleMenuOpen] = useState(false);
  
  // Sub-abas da aba Resultados
  const [resultsSubTab, setResultsSubTab] = useState<"overview" | "videos" | "retention" | "insights">("overview");
  const [selectedVideoRetention, setSelectedVideoRetention] = useState("oculos-de-sol.mp4");
  const [searchVideoQuery, setSearchVideoQuery] = useState("");

  // Estados da Aba Stories
  const [isCreatingStory, setIsCreatingStory] = useState(false);
  const [storySearchQuery, setStorySearchQuery] = useState("");
  const [storyStatusFilter, setStoryStatusFilter] = useState("all");
  const [storyName, setStoryName] = useState("");
  const [storyActive, setStoryActive] = useState(true);
  const [storyLayout, setStoryLayout] = useState<"flutuante" | "carrossel" | "grade" | "dinamico">("carrossel");
  const [scrollDirection, setScrollDirection] = useState("Horizontal");
  const [visualStyle, setVisualStyle] = useState("Seguir Padrão do App");
  const [cssSelector, setCssSelector] = useState(".breadcrumbs");
  const [displayPosition, setDisplayPosition] = useState("Acima do elemento");

  // Estados da Aba Biblioteca
  const [librarySearchQuery, setLibrarySearchQuery] = useState("");
  const [libraryTypeFilter, setLibraryTypeFilter] = useState<"all" | "videos" | "images">("all");
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  
  // Formulário do Modal de URL Externa
  const [externalUrl, setExternalUrl] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [linkedProduct, setLinkedProduct] = useState("Sem produto vinculado");
  const [linkedMeasureModel, setLinkedMeasureModel] = useState("Sem modelo de medidas vinculado");

  // Lista Mock de Stories
  const [storiesList, setStoriesList] = useState([
    {
      id: "st-1",
      name: "TESTE",
      substatus: "Ativo",
      type: "Flutuante",
      videoCount: 2,
      location: "Contém: /azul",
      views: 0,
      ctr: "0.0%",
      clicks: 0,
      status: "ATIVO"
    }
  ]);

  // Lista Mock de Mídias da Biblioteca
  const [mediaItems, setMediaItems] = useState([
    {
      id: "med-1",
      name: "oculos-de-sol.mp4",
      type: "video",
      formatLabel: "VÍDEO MP4 (HOSPEDADO)",
      thumb: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=120&q=80",
      product: null,
      story: "TESTE",
      size: "8.3 MB",
      status: "DISPONÍVEL"
    },
    {
      id: "med-2",
      name: "Criação_de_Vídeo_Fashion_Edit...",
      type: "video",
      formatLabel: "VÍDEO MP4 (HOSPEDADO)",
      thumb: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=120&q=80",
      product: {
        name: "Blusa Confort - Verd...",
        thumb: "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=80&q=80"
      },
      story: "TESTE",
      size: "2 MB",
      status: "DISPONÍVEL"
    },
    {
      id: "med-3",
      name: "LOGOTIPO_OFICIAL_LOJA.png",
      type: "image",
      formatLabel: "IMAGEM (HOSPEDADA)",
      thumb: "/assets/sll-logotipo-ico.png",
      product: null,
      story: null,
      size: "132.4 KB",
      status: "DISPONÍVEL"
    }
  ]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText("https://vidlytics.com.br/indique/useanny");
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleAddExternalUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!externalUrl) {
      alert("Por favor, preencha a URL externa do vídeo.");
      return;
    }
    const newMedia = {
      id: "med-" + Date.now(),
      name: mediaTitle || "video-externo.mp4",
      type: "video",
      formatLabel: "VÍDEO EXTERNO",
      thumb: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=120&q=80",
      product: linkedProduct !== "Sem produto vinculado" ? { name: linkedProduct, thumb: "" } : null,
      story: null,
      size: "URL Externa",
      status: "DISPONÍVEL"
    };
    setMediaItems([newMedia, ...mediaItems]);
    setIsUrlModalOpen(false);
    setExternalUrl("");
    setMediaTitle("");
    alert("Mídia cadastrada com sucesso!");
  };

  const filteredMedia = mediaItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(librarySearchQuery.toLowerCase());
    const matchesType = 
      libraryTypeFilter === "all" ? true :
      libraryTypeFilter === "videos" ? item.type === "video" :
      item.type === "image";
    return matchesSearch && matchesType;
  });

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
    { title: "Configurações da loja salvas: Use Anny", date: "15 de set. às 13:57" },
    { title: "Configurações da loja salvas: Use Anny", date: "15 de set. às 10:52" },
    { title: "Configurações da loja salvas: Use Anny", date: "10 de set. às 08:30" },
  ];

  const videoList = [
    {
      id: "vid-1",
      title: "oculos-de-sol.mp4",
      status: "Ativo",
      thumb: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=120&q=80",
      views: 0,
      ctr: "0,0%",
      conversions: 0,
      revenue: "—",
      likes: 1,
      comments: 0,
      shares: 0,
      duration: "—"
    },
    {
      id: "vid-2",
      title: "Criação_de_Vídeo_Fashion_...",
      status: "Ativo",
      thumb: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=120&q=80",
      views: 0,
      ctr: "0,0%",
      conversions: 0,
      revenue: "—",
      likes: 2,
      comments: 0,
      shares: 0,
      duration: "—"
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-12 relative flex flex-col justify-between font-sans">
      <div>
        {/* 1. BARRA GLOBAL SLL HUB */}
        <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
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

        {/* CONTAINER PRINCIPAL */}
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

              {/* Menu de Abas Principais */}
              <nav className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        if (tab.id !== "stories") setIsCreatingStory(false);
                      }}
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

          {/* ======================================================== */}
          {/* CONTEÚDO DA ABA 1: VISÃO GERAL */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <section className="bg-white rounded-xl px-4 py-2 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold text-slate-800 text-xs sm:text-sm">Olá, <strong>Use Anny</strong></span>
                  <span className="h-3 w-px bg-slate-200" />
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-50 text-[#0094eb] border border-blue-100">
                    Plano Scale
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-purple-50 text-purple-600 border border-purple-100">
                    Acesso Vitalício
                  </span>
                </div>

                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50/70 border border-emerald-200/60 px-2.5 py-0.5 rounded-md text-[11px]">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                  <span className="font-bold uppercase tracking-wider">Aplicativo Ativado:</span>
                  <span className="text-emerald-600 hidden md:inline">Seus vídeos estão online no seu e-commerce</span>
                </div>
              </section>

              {/* Seção Resultados de Vendas */}
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
                          0 Pedidos
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">R$ 0,00</div>
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
                          3 Pedidos
                        </span>
                      </div>
                      <div className="text-2xl font-black text-slate-900">R$ 378,39</div>
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
                      <div className="text-2xl font-black text-slate-900">R$ 0,00</div>
                      <div className="text-[11px] text-slate-400">Ver detalhes no Indica & Ganha →</div>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#0094eb]">
                      <DollarSign className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Consumo do Plano */}
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
                        <span className="text-2xl font-black text-slate-900">57</span>
                        <span className="text-xs text-slate-400">de 60.000</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-[#0094eb] h-1.5 rounded-full w-[1%]" />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Quota do mês</span>
                      <span>1%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Armazenamento</span>
                      <HardDrive className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">10.3 MB</span>
                        <span className="text-xs text-slate-400">de 50 GB</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-emerald-500 h-1.5 rounded-full w-[2%]" />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Vídeos na nuvem</span>
                      <span>2%</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Páginas com Vídeos</span>
                      <FileText className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-slate-900">1</span>
                        <span className="text-xs text-slate-400">de ilimitadas</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
                        <div className="bg-[#fd8539] h-1.5 rounded-full w-[5%]" />
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Locais de exibição</span>
                      <span>Ativo</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">Ciclo da Conta</span>
                      <Calendar className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Status</div>
                      <div className="text-xl font-black text-slate-900">Vitalício</div>
                    </div>
                    <div className="text-[11px] text-slate-400 flex justify-between">
                      <span>Renovação:</span>
                      <span>— (sem vencimento)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist e Atividade Recente */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              {/* Academy e Indique e Ganhe */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            </div>
          )}

          {/* ======================================================== */}
          {/* CONTEÚDO DA ABA 2: RESULTADOS (COM SUAS 4 SUB-ABAS) */}
          {/* ======================================================== */}
          {activeTab === "results" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              
              {/* CABEÇALHO DA SEÇÃO DE RESULTADOS */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">Resultados</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Métricas reais de <strong className="text-[#0094eb] font-bold">Joias e Semijoias</strong> comparadas aos benchmarks nacionais de 2026.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <select 
                    aria-label="Selecionar período"
                    className="bg-white border border-slate-200 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
                  >
                    <option value="30">30 dias</option>
                    <option value="7">7 dias</option>
                    <option value="90">90 dias</option>
                    <option value="all">Todo o período</option>
                  </select>
                </div>
              </div>

              {/* NAVEGAÇÃO DE SUB-ABAS (PÍLULAS) */}
              <div className="flex items-center gap-2 bg-slate-100/90 p-1 rounded-xl w-fit border border-slate-200/60 shadow-xs">
                <button
                  onClick={() => setResultsSubTab("overview")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resultsSubTab === "overview"
                      ? "bg-[#0094eb] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Visão Geral</span>
                </button>

                <button
                  onClick={() => setResultsSubTab("videos")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resultsSubTab === "videos"
                      ? "bg-[#0094eb] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Vídeos</span>
                </button>

                <button
                  onClick={() => setResultsSubTab("retention")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resultsSubTab === "retention"
                      ? "bg-[#0094eb] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>Retenção</span>
                </button>

                <button
                  onClick={() => setResultsSubTab("insights")}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    resultsSubTab === "insights"
                      ? "bg-[#0094eb] text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Insights</span>
                </button>
              </div>

              {/* SUB-ABA 1: VISÃO GERAL */}
              {resultsSubTab === "overview" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Resultados Financeiros
                      </h3>
                      <span className="text-[11px] text-slate-400 font-medium">Período: Últimos 30 dias</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
                            <span>Aguardando Pagamento</span>
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                          </div>
                          <div className="text-2xl font-black text-amber-500">R$ 378,39</div>
                          <p className="text-[11px] text-slate-400">3 pedidos em aberto</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                          <Clock className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
                            <span>Vendas Pagas</span>
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                          </div>
                          <div className="text-2xl font-black text-emerald-600">R$ 0,00</div>
                          <p className="text-[11px] text-slate-400">0 pedidos confirmados</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
                            <span>Indicações</span>
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                          </div>
                          <div className="text-2xl font-black text-purple-600">R$ 0,00</div>
                          <p className="text-[11px] text-slate-400">Comissões disponíveis</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <DollarSign className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase">
                            <span>Total Gerado</span>
                            <HelpCircle className="w-3 h-3 text-slate-400" />
                          </div>
                          <div className="text-2xl font-black text-[#0094eb]">R$ 0,00</div>
                          <p className="text-[11px] text-slate-400">Vendas Pagas + Indicações</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center">
                          <ShoppingBag className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    {/* Gráfico 1 */}
                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">📈 Evolução Financeira Diária (R$)</h4>
                          <p className="text-xs text-slate-400">Monitore faturamento aprovado, boletos/Pix em aberto e receitas por dia.</p>
                        </div>

                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold text-slate-600 flex-wrap">
                          <button className="px-2.5 py-1 rounded-lg bg-white text-slate-900 shadow-xs font-bold">Todas Juntas</button>
                          <button className="px-2.5 py-1 rounded-lg hover:text-slate-900">Aguardando</button>
                          <button className="px-2.5 py-1 rounded-lg hover:text-slate-900">Vendas Pagas</button>
                          <button className="px-2.5 py-1 rounded-lg hover:text-slate-900">Indicações</button>
                          <button className="px-2.5 py-1 rounded-lg hover:text-slate-900">Total Gerado</button>
                        </div>
                      </div>

                      <div className="relative h-56 w-full pt-4 pb-2 border-b border-slate-100 flex items-center justify-center overflow-hidden">
                        <svg className="w-full h-full" viewBox="0 0 900 180" preserveAspectRatio="none">
                          <line x1="0" y1="40" x2="900" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                          <line x1="0" y1="90" x2="900" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                          <line x1="0" y1="140" x2="900" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
                          
                          <path
                            d="M 0,160 L 350,160 Q 370,160 380,30 Q 390,160 410,160 L 680,160 Q 700,160 710,30 Q 720,160 740,160 L 900,160"
                            fill="none"
                            stroke="#fd8539"
                            strokeWidth="2.5"
                          />
                          <circle cx="380" cy="30" r="4.5" fill="#fd8539" stroke="#ffffff" strokeWidth="2" />
                          <circle cx="710" cy="30" r="4.5" fill="#fd8539" stroke="#ffffff" strokeWidth="2" />

                          <line x1="0" y1="160" x2="900" y2="160" stroke="#0094eb" strokeWidth="2" />
                        </svg>
                      </div>

                      <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 flex-wrap pt-2">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#fd8539]" /> Aguardando Pagamento</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Vendas Pagas</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> Indicações</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#0094eb]" /> Total Gerado</span>
                      </div>
                    </div>
                  </div>

                  {/* Bloco Performance dos Vídeos */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Performance dos Vídeos & Interação do Público
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Visualizações <HelpCircle className="w-3 h-3 text-slate-400" /></span>
                          <div className="text-2xl font-black text-slate-900">0</div>
                          <p className="text-[11px] text-slate-400">Sessões de stories abertas</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center">
                          <Eye className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Cliques em CTA <HelpCircle className="w-3 h-3 text-slate-400" /></span>
                          <div className="text-2xl font-black text-slate-900">0</div>
                          <p className="text-[11px] text-slate-400">Cliques no card/botão de compra</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                          <Zap className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Engajamento Social <HelpCircle className="w-3 h-3 text-slate-400" /></span>
                          <div className="flex items-center gap-4 pt-1">
                            <div><span className="text-xl font-black text-rose-500">0</span><span className="text-[10px] text-slate-400 block font-medium">Curtidas</span></div>
                            <div><span className="text-xl font-black text-[#0094eb]">0</span><span className="text-[10px] text-slate-400 block font-medium">Comentários</span></div>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                          <Heart className="w-5 h-5" />
                        </div>
                      </div>

                      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                        <div className="space-y-1">
                          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">CTR (Taxa de Cliques) <HelpCircle className="w-3 h-3 text-slate-400" /></span>
                          <div className="text-2xl font-black text-slate-900">0.0%</div>
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                            <span>📉 -3.9% vs Setor</span>
                          </div>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Percent className="w-5 h-5" />
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">📊 Evolução Diária de Engajamento & Funil de Vídeos</h4>
                          <p className="text-xs text-slate-400">Acompanhe o volume de visualizações, cliques nos produtos, reações e a taxa de CTR ao longo do tempo.</p>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-[11px] font-semibold text-slate-600 flex-wrap">
                          <button className="px-2.5 py-1 rounded-lg bg-white text-slate-900 shadow-xs font-bold">Todas Juntas</button>
                          <button className="px-2.5 py-1 rounded-lg hover:text-slate-900">Visualizações</button>
                          <button className="px-2.5 py-1 rounded-lg hover:text-slate-900">Cliques CTA</button>
                          <button className="px-2.5 py-1 rounded-lg hover:text-slate-900">Engajamento</button>
                          <button className="px-2.5 py-1 rounded-lg hover:text-slate-900">CTR (%)</button>
                        </div>
                      </div>
                      <div className="relative h-44 w-full pt-4 pb-2 border-b border-slate-100 flex items-end">
                        <div className="w-full h-px bg-[#0094eb]" />
                      </div>
                      <div className="flex items-center justify-center gap-4 text-[11px] text-slate-500 flex-wrap pt-2">
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#0094eb]" /> Visualizações</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Cliques em CTA</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500" /> Engajamento Social</span>
                        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Taxa de Cliques (CTR %)</span>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center flex-shrink-0">
                          <Compass className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs font-bold text-slate-900">Como funciona o benchmark do setor?</h4>
                          <p className="text-[11px] text-slate-500 leading-snug">
                            As metas de comparação do setor de <strong>Joias e Semijoias</strong> são baseadas em pesquisas consolidadas de mercado nacional de 2026.
                          </p>
                        </div>
                      </div>
                      <button className="whitespace-nowrap px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl transition-colors shadow-xs flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Ver Estudo de Mercado</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 2: VÍDEOS */}
              {resultsSubTab === "videos" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Total de Visualizações <HelpCircle className="w-3 h-3 text-slate-400" /></span>
                        <div className="text-2xl font-black text-slate-900">0</div>
                        <p className="text-[11px] text-slate-400">Média de <strong>0</strong> por vídeo</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center"><Eye className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">CTR Médio Geral <HelpCircle className="w-3 h-3 text-slate-400" /></span>
                        <div className="text-2xl font-black text-slate-900">0,0%</div>
                        <p className="text-[11px] text-slate-400">Em 2 vídeos analisados</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><Percent className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Conversões Atribuídas <HelpCircle className="w-3 h-3 text-slate-400" /></span>
                        <div className="text-2xl font-black text-slate-900">0</div>
                        <p className="text-[11px] text-slate-400">Receita: <strong className="text-emerald-600">R$ 0,00</strong></p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-[#fd8539] flex items-center justify-center"><ShoppingBag className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">Engajamento Total <HelpCircle className="w-3 h-3 text-slate-400" /></span>
                        <div className="flex items-center gap-4 pt-1">
                          <div><span className="text-xl font-black text-rose-500">3</span><span className="text-[10px] text-slate-400 block font-medium">Curtidas</span></div>
                          <div><span className="text-xl font-black text-[#0094eb]">0</span><span className="text-[10px] text-slate-400 block font-medium">Comentários</span></div>
                        </div>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><Heart className="w-5 h-5" /></div>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Buscar por título do vídeo..."
                      value={searchVideoQuery}
                      onChange={(e) => setSearchVideoQuery(e.target.value)}
                      className="w-full bg-white border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 shadow-xs"
                    />
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/80 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="px-5 py-3.5">Vídeo</th>
                            <th className="px-4 py-3.5 text-center">Visualizações ▾</th>
                            <th className="px-4 py-3.5 text-center">CTR</th>
                            <th className="px-4 py-3.5 text-center">Conversões</th>
                            <th className="px-4 py-3.5 text-center">Receita</th>
                            <th className="px-4 py-3.5 text-center">Engajamento</th>
                            <th className="px-5 py-3.5 text-right">Duração</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {videoList.map((v) => (
                            <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-5 py-3.5 flex items-center gap-3">
                                <div className="w-10 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0 relative group">
                                  <img src={v.thumb} alt={v.title} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-xs">{v.title}</p>
                                  <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-100">{v.status}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5 text-center font-bold text-slate-800">{v.views}</td>
                              <td className="px-4 py-3.5 text-center font-bold text-rose-500">{v.ctr}</td>
                              <td className="px-4 py-3.5 text-center font-bold text-slate-800">{v.conversions}</td>
                              <td className="px-4 py-3.5 text-center text-slate-400">{v.revenue}</td>
                              <td className="px-4 py-3.5 text-center text-slate-500">
                                <span className="inline-flex items-center gap-2 text-[11px]">
                                  <span className="flex items-center gap-0.5 text-rose-500 font-bold"><Heart className="w-3 h-3" /> {v.likes}</span>
                                  <span className="flex items-center gap-0.5 text-blue-500 font-bold"><MessageSquare className="w-3 h-3" /> {v.comments}</span>
                                  <span className="flex items-center gap-0.5 text-amber-500 font-bold"><Share2 className="w-3 h-3" /> {v.shares}</span>
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-right text-slate-400">{v.duration}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 3: RETENÇÃO */}
              {resultsSubTab === "retention" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Taxa de Conclusão</span>
                        <div className="text-2xl font-black text-slate-900">0%</div>
                        <p className="text-[11px] text-slate-400">Assistiram até o último segundo</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Tempo Médio</span>
                        <div className="text-2xl font-black text-slate-900">0s <span className="text-xs text-slate-400 font-normal">de 15s</span></div>
                        <p className="text-[11px] text-slate-400">0% da duração total</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center"><Clock className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Maior Queda</span>
                        <div className="text-2xl font-black text-slate-900">12s</div>
                        <p className="text-[11px] text-slate-400">Momento com maior evasão do público</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center"><Zap className="w-5 h-5" /></div>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Taxa de Evasão</span>
                        <div className="text-2xl font-black text-rose-500">100%</div>
                        <p className="text-[11px] text-slate-400">Saíram antes do final</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center"><LogOut className="w-5 h-5" /></div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 uppercase">Vídeo Analisado</h4>
                      <p className="text-[11px] text-slate-400">Selecione qual vídeo você quer inspecionar</p>
                    </div>
                    <select
                      aria-label="Selecionar vídeo para análise de retenção"
                      value={selectedVideoRetention}
                      onChange={(e) => setSelectedVideoRetention(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 shadow-xs focus:ring-2 focus:ring-[#0094eb]/20"
                    >
                      <option value="oculos-de-sol.mp4">oculos-de-sol.mp4</option>
                      <option value="Criação_de_Vídeo_Fashion_...">Criação_de_Vídeo_Fashion_...</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-bold text-slate-900">Curva de Retenção (Segundo a Segundo)</h4>
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-400">Acompanhe onde a audiência perde o interesse ou onde fica engajada</p>
                      </div>
                      <div className="relative h-60 w-full pt-4">
                        <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                          <defs>
                            <linearGradient id="retentionGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#0094eb" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="#0094eb" stopOpacity="0.02" />
                            </linearGradient>
                          </defs>
                          <path d="M 0,20 L 400,20 Q 450,20 480,50 L 600,75 L 600,200 L 0,200 Z" fill="url(#retentionGrad)" />
                          <path d="M 0,20 L 400,20 Q 450,20 480,50 L 600,75" fill="none" stroke="#0094eb" strokeWidth="3" />
                          <line x1="480" y1="0" x2="480" y2="200" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />
                        </svg>
                        <div className="flex justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-100">
                          <span>0s</span><span>2s</span><span>4s</span><span>6s</span><span>8s</span><span>10s</span><span className="text-rose-500 font-bold">12s</span><span>14s</span><span>15s</span>
                        </div>
                      </div>
                      <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5">
                        <Sparkles className="w-4 h-4 text-[#0094eb] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-blue-900 leading-relaxed">
                          <strong>Diagnóstico Inteligente:</strong> Boa retenção inicial. A maior parte da audiência permaneceu além dos primeiros segundos de exibição.
                        </p>
                      </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-3 flex flex-col items-center">
                      <div className="w-full text-left">
                        <h4 className="text-sm font-bold text-slate-900">Visualização</h4>
                        <p className="text-xs text-slate-400 truncate">{selectedVideoRetention}</p>
                      </div>
                      <div className="relative w-52 h-[340px] rounded-2xl overflow-hidden bg-black shadow-lg border-2 border-slate-800">
                        <img 
                          src="https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=400&q=80" 
                          alt="Video Preview" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-between p-3 text-white">
                          <div className="text-[10px] font-bold bg-black/40 px-2 py-0.5 rounded w-fit">0:12 / 0:15</div>
                          <div className="space-y-1">
                            <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
                              <div className="bg-[#0094eb] h-full w-[80%]" />
                            </div>
                            <div className="flex items-center justify-between text-xs pt-1">
                              <Play className="w-4 h-4 fill-current cursor-pointer" />
                              <span className="text-[10px] uppercase font-bold">Vidlytics Player</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-ABA 4: INSIGHTS */}
              {resultsSubTab === "insights" && (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#0094eb] flex items-center justify-center shadow-xs">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900">Vidlytics AI Insights</h3>
                        <p className="text-xs text-slate-400">Análise inteligente do comportamento dos seus Stories nos últimos <strong>30 dias</strong>.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-600 transition-colors shadow-xs">
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Atualizar</span>
                      </button>
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-[#0094eb] border border-blue-100 text-xs font-bold shadow-xs">
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>Motor de Regras Ativo</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-16 text-center space-y-4 flex flex-col items-center justify-center min-h-[360px]">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                      <Video className="w-8 h-8 stroke-[1.5]" />
                    </div>
                    <div className="max-w-md space-y-1.5">
                      <h4 className="text-base font-bold text-slate-800">Sem insights para este período</h4>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Precisamos de mais dados de visualizações e interações para gerar análises confiáveis. Volte em breve ou clique em "Atualizar".
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* CONTEÚDO DA ABA 3: STORIES */}
          {/* ======================================================== */}
          {activeTab === "stories" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {!isCreatingStory ? (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-black text-slate-900">Stories</h1>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Gerencie as configurações de exibição e agrupamento de vídeos na sua loja.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsCreatingStory(true)}
                      className="px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-black uppercase rounded-xl transition-all shadow-sm shadow-[#0094eb]/20 flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Novo Story</span>
                    </button>
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Buscar por nome do story..."
                          value={storySearchQuery}
                          onChange={(e) => setStorySearchQuery(e.target.value)}
                          className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                        />
                      </div>

                      <select
                        aria-label="Filtrar por status"
                        value={storyStatusFilter}
                        onChange={(e) => setStoryStatusFilter(e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 shadow-xs focus:ring-2 focus:ring-[#0094eb]/20 uppercase w-full sm:w-auto"
                      >
                        <option value="all">TODOS STATUS</option>
                        <option value="active">ATIVO</option>
                        <option value="inactive">INATIVO</option>
                      </select>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-600">
                      {storiesList.length} Story Encontrado
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="px-4 py-3">Story / Nome</th>
                            <th className="px-4 py-3 text-center">Tipo</th>
                            <th className="px-4 py-3 text-center">Vídeos</th>
                            <th className="px-4 py-3 text-center">Localização</th>
                            <th className="px-4 py-3 text-center">Visualizações</th>
                            <th className="px-4 py-3 text-center">CTR / Cliques</th>
                            <th className="px-4 py-3 text-center">Status</th>
                            <th className="px-4 py-3 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {storiesList.map((story) => (
                            <tr key={story.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-4 py-3.5 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0094eb] flex items-center justify-center flex-shrink-0">
                                  <Send className="w-4 h-4 -rotate-45" />
                                </div>
                                <div>
                                  <p className="font-bold text-slate-800 text-xs">{story.name}</p>
                                  <span className="text-[10px] text-emerald-600 font-bold">{story.substatus}</span>
                                </div>
                              </td>

                              <td className="px-4 py-3.5 text-center">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-[#0094eb] border border-blue-100">
                                  <Send className="w-3 h-3 -rotate-45" />
                                  <span>{story.type}</span>
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                                {story.videoCount}
                              </td>

                              <td className="px-4 py-3.5 text-center">
                                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                  {story.location}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                                {story.views}
                              </td>

                              <td className="px-4 py-3.5 text-center">
                                <span className="text-rose-500 font-bold block">{story.ctr}</span>
                                <span className="text-[10px] text-slate-400 block">{story.clicks} cliques</span>
                              </td>

                              <td className="px-4 py-3.5 text-center">
                                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200">
                                  {story.status}
                                </span>
                              </td>

                              <td className="px-4 py-3.5 text-right">
                                <div className="flex items-center justify-end gap-1.5 text-slate-400">
                                  <button title="Visualizar" className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <button 
                                    title="Editar" 
                                    onClick={() => {
                                      setStoryName(story.name);
                                      setIsCreatingStory(true);
                                    }}
                                    className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors"
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button title="Excluir" className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in duration-150">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setIsCreatingStory(false)}
                        className="w-8 h-8 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors shadow-xs"
                        title="Voltar à lista"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-900 leading-tight">Novo Story</h1>
                        <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Criar Novo Story</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-xs">
                        <span className="text-[11px] font-bold text-slate-600 uppercase">Status:</span>
                        <span className={`text-[11px] font-bold ${storyActive ? "text-emerald-600" : "text-slate-400"}`}>
                          {storyActive ? "ATIVO" : "INATIVO"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setStoryActive(!storyActive)}
                          className={`w-9 h-5 flex items-center rounded-full p-1 cursor-pointer transition-colors ${
                            storyActive ? "bg-emerald-500" : "bg-slate-300"
                          }`}
                        >
                          <div
                            className={`bg-white w-3.5 h-3.5 rounded-full shadow-md transform transition-transform ${
                              storyActive ? "translate-x-4" : "translate-x-0"
                            }`}
                          />
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-500 text-[11px] font-bold border border-slate-200">
                        <Eye className="w-3.5 h-3.5" />
                        <span>SALVE PARA HABILITAR O PREVIEW</span>
                      </div>

                      <button
                        onClick={() => {
                          setIsCreatingStory(false);
                          alert("Story salvo com sucesso!");
                        }}
                        className="px-5 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-[#0094eb]/20 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        <span>Salvar Alterações</span>
                      </button>
                    </div>
                  </div>

                  {/* BLOCO 1: DESIGN E FORMATO */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#0094eb]" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Design e Formato</h3>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Nome do Story
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Lançamentos"
                          value={storyName}
                          onChange={(e) => setStoryName(e.target.value)}
                          className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                          Layout de Exibição
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <button
                            type="button"
                            onClick={() => setStoryLayout("flutuante")}
                            className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2.5 transition-all ${
                              storyLayout === "flutuante"
                                ? "border-[#0094eb] bg-blue-50/30 text-[#0094eb] ring-1 ring-[#0094eb]"
                                : "border-slate-200 hover:border-slate-300 text-slate-500 bg-white"
                            }`}
                          >
                            <Send className="w-5 h-5 -rotate-45" />
                            <span className="text-xs font-bold uppercase">Flutuante</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStoryLayout("carrossel")}
                            className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2.5 transition-all ${
                              storyLayout === "carrossel"
                                ? "border-[#0094eb] bg-blue-50/30 text-[#0094eb] ring-1 ring-[#0094eb]"
                                : "border-slate-200 hover:border-slate-300 text-slate-500 bg-white"
                            }`}
                          >
                            <FolderOpen className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase">Carrossel</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStoryLayout("grade")}
                            className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center gap-2.5 transition-all ${
                              storyLayout === "grade"
                                ? "border-[#0094eb] bg-blue-50/30 text-[#0094eb] ring-1 ring-[#0094eb]"
                                : "border-slate-200 hover:border-slate-300 text-slate-500 bg-white"
                            }`}
                          >
                            <Layers className="w-5 h-5" />
                            <span className="text-xs font-bold uppercase">Grade</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setStoryLayout("dinamico")}
                            className={`p-5 rounded-2xl border flex flex-col items-center justify-center text-center gap-1.5 transition-all ${
                              storyLayout === "dinamico"
                                ? "border-[#0094eb] bg-blue-50/30 text-[#0094eb] ring-1 ring-[#0094eb]"
                                : "border-slate-200 hover:border-slate-300 text-slate-400 bg-white"
                            }`}
                          >
                            <FolderOpen className="w-5 h-5 opacity-70" />
                            <span className="text-xs font-bold uppercase">Carrossel Dinâmico</span>
                            <span className="text-[10px] text-slate-400">Adicione 3 vídeos</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Direção de Rolagem
                        </label>
                        <select
                          aria-label="Direção de rolagem"
                          value={scrollDirection}
                          onChange={(e) => setScrollDirection(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs focus:ring-2 focus:ring-[#0094eb]/20"
                        >
                          <option value="Horizontal">Horizontal</option>
                          <option value="Vertical">Vertical</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Estilo Visual / Aparência
                        </label>
                        <select
                          aria-label="Estilo visual e aparência"
                          value={visualStyle}
                          onChange={(e) => setVisualStyle(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs focus:ring-2 focus:ring-[#0094eb]/20"
                        >
                          <option value="Seguir Padrão do App">Seguir Padrão do App</option>
                          <option value="Personalizado">Personalizado</option>
                        </select>
                      </div>

                    </div>
                  </div>

                  {/* BLOCO 2: CONTEÚDO SELECIONADO */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="w-4 h-4 text-[#0094eb]" />
                        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Conteúdo Selecionado</h3>
                      </div>

                      <button
                        type="button"
                        className="px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold uppercase rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Adicionar Vídeos</span>
                      </button>
                    </div>

                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center space-y-3 flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                        <Video className="w-6 h-6 stroke-[1.5]" />
                      </div>
                      <p className="text-xs font-bold text-slate-400">Nenhum vídeo selecionado</p>
                      <button
                        type="button"
                        className="px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold uppercase rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Adicionar Vídeos</span>
                      </button>
                    </div>
                  </div>

                  {/* BLOCO 3: LOCAL DE EXIBIÇÃO */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Crosshair className="w-4 h-4 text-[#0094eb]" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Local de Exibição</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Seletor CSS
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={cssSelector}
                            onChange={(e) => setCssSelector(e.target.value)}
                            className="w-full bg-slate-50/60 border border-slate-200 rounded-xl pl-4 pr-28 py-2.5 text-xs text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-xs"
                          >
                            <Crosshair className="w-3 h-3 text-[#fd8539]" />
                            <span>Selecionar</span>
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                          Posição
                        </label>
                        <select
                          aria-label="Posição do elemento"
                          value={displayPosition}
                          onChange={(e) => setDisplayPosition(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs focus:ring-2 focus:ring-[#0094eb]/20"
                        >
                          <option value="Acima do elemento">Acima do elemento</option>
                          <option value="Abaixo do elemento">Abaixo do elemento</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* BLOCO 4: QUAL PÁGINA IRÁ APARECER? */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-[#0094eb]" />
                      <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Qual página irá aparecer?</h3>
                    </div>

                    <button
                      type="button"
                      className="px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold uppercase rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Adicionar Página</span>
                    </button>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setIsCreatingStory(false);
                        alert("Story salvo com sucesso!");
                      }}
                      className="px-6 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold rounded-xl transition-all shadow-sm shadow-[#0094eb]/20 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>Salvar Alterações</span>
                    </button>
                  </div>

                </div>
              )}

            </div>
          )}

          {/* ======================================================== */}
          {/* CONTEÚDO DA ABA 4: BIBLIOTECA */}
          {/* ======================================================== */}
          {activeTab === "library" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              {/* CABEÇALHO DA BIBLIOTECA */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">Biblioteca</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Gerencie os vídeos e imagens hospedados no seu plano e monitore o consumo de espaço.
                  </p>
                </div>

                {/* BOTÕES DE AÇÃO SUPERIORES */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button 
                    onClick={() => alert("Conexão direta com Instagram em breve.")}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-xs flex items-center gap-1.5 uppercase"
                  >
                    <Instagram className="w-4 h-4 text-pink-600" />
                    <span>Instagram</span>
                  </button>

                  <button 
                    onClick={() => alert("Conexão direta com TikTok em breve.")}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-xs flex items-center gap-1.5 uppercase"
                  >
                    <Music2 className="w-4 h-4 text-slate-800" />
                    <span>TikTok</span>
                  </button>

                  <button 
                    onClick={() => setIsUrlModalOpen(true)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-colors shadow-xs flex items-center gap-1.5 uppercase"
                  >
                    <Link2 className="w-4 h-4 text-[#0094eb]" />
                    <span>URL Externa</span>
                  </button>

                  <button 
                    onClick={() => alert("Selecione o arquivo de vídeo do seu computador.")}
                    className="px-4 py-2 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-black uppercase rounded-xl transition-all shadow-sm shadow-[#0094eb]/20 flex items-center gap-2"
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Fazer Upload</span>
                  </button>
                </div>
              </div>

              {/* CARD DE ARMAZENAMENTO SCALE */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-[#0094eb] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 uppercase tracking-wide">Scale</span>
                        <span className="px-2 py-0.5 text-[10px] font-black uppercase rounded-full bg-blue-50 text-[#0094eb] border border-blue-100">
                          50 GB Limite
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-medium">Uso atual: <strong>10.3 MB</strong> de 50 GB</p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-lg font-black text-emerald-600">0.1%</span>
                    <span className="text-[11px] text-slate-400 block font-medium">Espaço Consumido</span>
                  </div>
                </div>

                {/* Barra de Progresso Fina */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-[#0094eb] h-1.5 rounded-full w-[0.1%]" />
                </div>
              </div>

              {/* CONTAINER COM FILTROS E TABELA */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 sm:p-6 space-y-4">
                
                {/* Barra de Busca + Pílulas de Filtro (Todos / Vídeos / Imagens) */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                  <div className="relative flex-1 w-full">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Pesquisar pelo nome do arquivo..."
                      value={librarySearchQuery}
                      onChange={(e) => setLibrarySearchQuery(e.target.value)}
                      className="w-full bg-slate-50/70 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full md:w-auto">
                    <button
                      onClick={() => setLibraryTypeFilter("all")}
                      className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                        libraryTypeFilter === "all"
                          ? "bg-[#0094eb] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setLibraryTypeFilter("videos")}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                        libraryTypeFilter === "videos"
                          ? "bg-[#0094eb] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <Video className="w-3.5 h-3.5" />
                      <span>Vídeos</span>
                    </button>
                    <button
                      onClick={() => setLibraryTypeFilter("images")}
                      className={`flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                        libraryTypeFilter === "images"
                          ? "bg-[#0094eb] text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Imagens</span>
                    </button>
                  </div>
                </div>

                {/* Faixa Contadora */}
                <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider text-slate-600">
                  {filteredMedia.length} Mídias Listadas
                </div>

                {/* Tabela da Biblioteca */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/60 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3">Mídia</th>
                        <th className="px-4 py-3">Nome do Arquivo</th>
                        <th className="px-4 py-3 text-center">Produto</th>
                        <th className="px-4 py-3 text-center">Story Vinculado</th>
                        <th className="px-4 py-3 text-center">Tamanho</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredMedia.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          {/* Miniatura Mídia */}
                          <td className="px-4 py-3.5">
                            <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center flex-shrink-0">
                              <img 
                                src={item.thumb} 
                                alt={item.name} 
                                className="w-full h-full object-cover" 
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                            </div>
                          </td>

                          {/* Nome e Tipo */}
                          <td className="px-4 py-3.5">
                            <p className="font-bold text-slate-800 text-xs">{item.name}</p>
                            <span className="text-[10px] text-[#0094eb] font-bold uppercase tracking-wider">
                              {item.formatLabel}
                            </span>
                          </td>

                          {/* Produto Vinculado */}
                          <td className="px-4 py-3.5 text-center">
                            {item.product ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                {item.product.thumb && (
                                  <img src={item.product.thumb} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                                )}
                                <span>{item.product.name}</span>
                              </span>
                            ) : (
                              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-medium bg-slate-100/80 text-slate-400">
                                Sem produto
                              </span>
                            )}
                          </td>

                          {/* Story Vinculado */}
                          <td className="px-4 py-3.5 text-center">
                            {item.story ? (
                              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-[#0094eb] border border-blue-100">
                                {item.story}
                              </span>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>

                          {/* Tamanho */}
                          <td className="px-4 py-3.5 text-center text-slate-600 font-semibold">
                            {item.size}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-600 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 stroke-[2.5]" />
                              <span>{item.status}</span>
                            </span>
                          </td>

                          {/* Ações */}
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 text-slate-400">
                              {item.type === "video" && (
                                <button title="Editar" className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors">
                                  <Edit2 className="w-4 h-4" />
                                </button>
                              )}
                              <button title="Visualizar" className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button title="Download" className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors">
                                <Download className="w-4 h-4" />
                              </button>
                              <button title="Excluir" className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

              </div>
            </div>
          )}

          {/* Placeholders limpos para as próximas abas */}
          {["products", "comments", "appearance"].includes(activeTab) && (
            <div className="bg-white rounded-2xl p-12 border border-slate-200/80 shadow-xs text-center space-y-3 animate-in fade-in">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0094eb] mx-auto flex items-center justify-center">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Aba "{tabs.find(t => t.id === activeTab)?.label}"
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Pronta para receber a interface visual na próxima etapa.
              </p>
            </div>
          )}

        </main>
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADICIONAR VÍDEO POR URL EXTERNA */}
      {/* ======================================================== */}
      {isUrlModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            
            {/* Header do Modal */}
            <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0094eb] flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-snug">Adicionar Vídeo por URL</h3>
                  <p className="text-xs text-slate-400 leading-tight">
                    Insira links do Pinterest, YouTube, Panda Video, Bunny CDN ou link direto.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsUrlModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário do Modal */}
            <form onSubmit={handleAddExternalUrl} className="p-6 space-y-4">
              {/* Campo 1: URL Externa */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Link / URL Externa do Vídeo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://pinterest.com/pin/... ou YouTube / Link direto"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                />
              </div>

              {/* Campo 2: Título da Mídia */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Título ou Identificação da Mídia
                </label>
                <input
                  type="text"
                  placeholder="Ex: REEL_PROMO_LANCAMENTO.mp4"
                  value={mediaTitle}
                  onChange={(e) => setMediaTitle(e.target.value)}
                  className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                />
              </div>

              {/* Campo 3: Vincular a Produto */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Vincular a um Produto (Opcional)
                </label>
                <select
                  aria-label="Vincular a um produto opcional"
                  value={linkedProduct}
                  onChange={(e) => setLinkedProduct(e.target.value)}
                  className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs focus:ring-2 focus:ring-[#0094eb]/20"
                >
                  <option value="Sem produto vinculado">Sem produto vinculado</option>
                  <option value="Blusa Confort - Verde">Blusa Confort - Verde</option>
                  <option value="Óculos de Sol Vintage">Óculos de Sol Vintage</option>
                </select>
              </div>

              {/* Campo 4: Modelo de Medidas */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Vincular a um Modelo de Medidas (Opcional)
                </label>
                <select
                  aria-label="Vincular a um modelo de medidas opcional"
                  value={linkedMeasureModel}
                  onChange={(e) => setLinkedMeasureModel(e.target.value)}
                  className="w-full bg-slate-50/60 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-xs focus:ring-2 focus:ring-[#0094eb]/20"
                >
                  <option value="Sem modelo de medidas vinculado">Sem modelo de medidas vinculado</option>
                  <option value="Tabela Geral Vestuário Feminino">Tabela Geral Vestuário Feminino</option>
                </select>
              </div>

              {/* Botões do Rodapé do Modal */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUrlModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-black uppercase rounded-xl transition-all shadow-sm shadow-[#0094eb]/20"
                >
                  Cadastrar Mídia
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* RODAPÉ INSTITUCIONAL */}
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

      {/* SUPORTE FLUTUANTE */}
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
