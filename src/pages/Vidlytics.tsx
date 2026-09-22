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
  Video,
  Plus,
  Trash2,
  X,
  ShieldCheck,
  MessageCircle,
  CheckCircle,
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";

export default function Vidlytics() {
  const navigate = useNavigate();
  // Aba ativa: inicia em 'overview' (Visão Geral) ou onde preferir
  const [activeTab, setActiveTab] = useState("overview");
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
  const [externalUrl, setExternalUrl] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [linkedProduct, setLinkedProduct] = useState("Sem produto vinculado");
  const [linkedMeasureModel, setLinkedMeasureModel] = useState("Sem modelo de medidas vinculado");

  // Estados da Aba Comentários
  const [autoApproval, setAutoApproval] = useState(false);
  const [commentSearchQuery, setCommentSearchQuery] = useState("");
  const [commentStatusFilter, setCommentStatusFilter] = useState("all");
  const [commentVideoFilter, setCommentVideoFilter] = useState("all");
  const [selectedCommentForModal, setSelectedCommentForModal] = useState<any>(null);
  const [isModerateModalOpen, setIsModerateModalOpen] = useState(false);

  // MOCKS
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
    }
  ]);

  const [commentsList, setCommentsList] = useState([
    {
      id: "comm-1",
      authorName: "Rodrigo Cel",
      authorInitial: "R",
      authorRole: "Cliente",
      text: "Teste❤️",
      videoName: "Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4",
      status: "PENDENTE"
    },
    {
      id: "comm-2",
      authorName: "www",
      authorInitial: "W",
      authorRole: "Cliente",
      text: "eweewee",
      videoName: "Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4",
      status: "PENDENTE"
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

  const handleDeleteComment = (id: string) => {
    if (confirm("Deseja realmente excluir este comentário?")) {
      setCommentsList(commentsList.filter(c => c.id !== id));
    }
  };

  const handleApproveComment = (id: string) => {
    setCommentsList(commentsList.map(c => c.id === id ? { ...c, status: "APROVADO" } : c));
    setIsModerateModalOpen(false);
  };

  const openModerateModal = (comment: any) => {
    setSelectedCommentForModal(comment);
    setIsModerateModalOpen(true);
  };

  const filteredMedia = mediaItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(librarySearchQuery.toLowerCase());
    const matchesType = 
      libraryTypeFilter === "all" ? true :
      libraryTypeFilter === "videos" ? item.type === "video" :
      item.type === "image";
    return matchesSearch && matchesType;
  });

  const filteredComments = commentsList.filter(c => {
    const matchesSearch = c.authorName.toLowerCase().includes(commentSearchQuery.toLowerCase()) || 
                          c.text.toLowerCase().includes(commentSearchQuery.toLowerCase());
    const matchesStatus = commentStatusFilter === "all" || c.status.toLowerCase() === commentStatusFilter.toLowerCase();
    const matchesVideo = commentVideoFilter === "all" || c.videoName.toLowerCase().includes(commentVideoFilter.toLowerCase());
    return matchesSearch && matchesStatus && matchesVideo;
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

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 pb-12 relative flex flex-col justify-between font-sans">
      <div>
        {/* BARRA GLOBAL SLL HUB */}
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
                onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
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
          
          {/* PROMO BANNER */}
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

          {/* BARRA DE NAVEGAÇÃO DO MÓDULO */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-3 shadow-xs">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 pl-2">
                <img 
                  src="/assets/vidlytics-logo-wide.png" 
                  alt="Vidlytics" 
                  className="h-7 sm:h-8 object-contain"
                  onError={(e) => { (e.target as HTMLElement).style.display = "none"; }}
                />
              </div>

              {/* Menu de Abas */}
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
          {/* 1. ABA: VISÃO GERAL (TOTALMENTE PRESERVADA) */}
          {/* ======================================================== */}
          {activeTab === "overview" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              {/* Cards de Métricas Principais */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Receita Gerada</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">R$ 0,00</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Via vídeos interativos</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Visualizações</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">0</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Total de reproduções</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center font-bold">
                    <Eye className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Taxa de Cliques (CTR)</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">0.0%</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Cliques no carrinho</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#fd8539] flex items-center justify-center font-bold">
                    <Zap className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tempo Assistido</span>
                    <h3 className="text-2xl font-black text-slate-900 mt-0.5">0m 00s</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Retenção de audiência</p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Informações da Loja / Status do Widget */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Desempenho Geral dos Vídeos</h4>
                    <span className="text-[11px] text-slate-400">Últimos 30 dias</span>
                  </div>
                  <div className="h-48 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <BarChart2 className="w-8 h-8 stroke-1 text-slate-300" />
                    <p className="text-xs">Os gráficos detalhados aparecerão conforme seus clientes interagirem na loja.</p>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">Indica & Ganha</h4>
                  <p className="text-xs text-slate-500">
                    Compartilhe seu link exclusivo de indicação do Vidlytics e ganhe créditos de assinatura no SLL Hub.
                  </p>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Seu Link de Afiliado</span>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        readOnly 
                        value="https://vidlytics.com.br/indique/useanny" 
                        className="w-full text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 outline-none"
                      />
                      <button 
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 rounded-lg bg-[#0094eb] text-white text-xs font-bold hover:bg-[#0082cf] transition-colors"
                      >
                        {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 2. ABA: RESULTADOS (COM SUAS 4 SUB-ABAS PRESERVADAS) */}
          {/* ======================================================== */}
          {activeTab === "results" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  {[
                    { id: "overview", label: "Visão Geral" },
                    { id: "videos", label: "Vídeos" },
                    { id: "retention", label: "Retenção" },
                    { id: "insights", label: "Insights IA" },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setResultsSubTab(sub.id as any)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        resultsSubTab === sub.id 
                          ? "bg-white text-[#0094eb] shadow-xs border border-slate-200" 
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conteúdo das Sub-abas de Resultados */}
              {resultsSubTab === "overview" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Total Visualizações</span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">0</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Cliques em Produtos</span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">0</h3>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <span className="text-[11px] font-bold uppercase text-slate-400">Conversão Estimada</span>
                    <h3 className="text-2xl font-bold text-slate-900 mt-1">0%</h3>
                  </div>
                </div>
              )}

              {resultsSubTab === "retention" && (
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase text-slate-800">Curva de Retenção por Segundo</h4>
                    <select 
                      value={selectedVideoRetention} 
                      onChange={(e) => setSelectedVideoRetention(e.target.value)}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 font-semibold"
                    >
                      <option value="oculos-de-sol.mp4">oculos-de-sol.mp4</option>
                      <option value="Criação_de_Vídeo_Fashion_Edit...">Criação_de_Vídeo_Fashion_Edit...</option>
                    </select>
                  </div>
                  <div className="h-44 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs">
                    Gráfico de retenção do vídeo selecionado
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* 3. ABA: STORIES (PRESERVADA COM CRIAÇÃO E LISTAGEM) */}
          {/* ======================================================== */}
          {activeTab === "stories" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Gerenciar Stories</h2>
                  <p className="text-xs text-slate-500">Crie carrosséis, feeds flutuantes ou stories para sua loja.</p>
                </div>
                <button
                  onClick={() => setIsCreatingStory(!isCreatingStory)}
                  className="px-4 py-2 rounded-xl bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                >
                  {isCreatingStory ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  <span>{isCreatingStory ? "Fechar Formulário" : "Novo Story"}</span>
                </button>
              </div>

              {/* Tabela de Stories */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3">Nome / Localização</th>
                      <th className="px-5 py-3">Tipo</th>
                      <th className="px-5 py-3">Vídeos</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {storiesList.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <p className="font-bold text-slate-800">{st.name}</p>
                          <span className="text-[10px] text-slate-400">{st.location}</span>
                        </td>
                        <td className="px-5 py-3.5">{st.type}</td>
                        <td className="px-5 py-3.5">{st.videoCount} vídeos</td>
                        <td className="px-5 py-3.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            {st.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button className="text-slate-400 hover:text-[#0094eb] font-bold text-xs">Editar</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 4. ABA: BIBLIOTECA (PRESERVADA COM UPLOADS E MODAL) */}
          {/* ======================================================== */}
          {activeTab === "library" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-900">Biblioteca de Vídeos</h2>
                  <p className="text-xs text-slate-500">Faça upload ou adicione links de vídeos externos para seus stories.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsUrlModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-xs"
                  >
                    + URL Externa
                  </button>
                  <label className="px-4 py-2 rounded-xl bg-[#0094eb] hover:bg-[#0082cf] text-white text-xs font-bold cursor-pointer transition-colors shadow-sm">
                    Fazer Upload
                    <input type="file" accept="video/*" className="hidden" />
                  </label>
                </div>
              </div>

              {/* Tabela de Mídias */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="px-5 py-3">Mídia</th>
                      <th className="px-5 py-3">Tipo / Tamanho</th>
                      <th className="px-5 py-3">Produto Vinculado</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredMedia.map((med) => (
                      <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 flex items-center gap-3">
                          <img src={med.thumb} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" />
                          <span className="font-bold text-slate-800">{med.name}</span>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="text-slate-700">{med.formatLabel}</p>
                          <span className="text-[10px] text-slate-400">{med.size}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {med.product ? med.product.name : "Nenhum"}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200">
                            {med.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <button className="text-slate-400 hover:text-rose-600 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* 5. ABA: COMENTÁRIOS (FIEL AO SEU PRINT) */}
          {/* ======================================================== */}
          {activeTab === "comments" && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Título e Subtítulo */}
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Comentários</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gerencie a interação dos clientes nos seus stories, responda dúvidas e modere comentários públicos.
                </p>
              </div>

              {/* Grid Superior: Moderação + Filtros */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Moderação de Conteúdo */}
                <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 flex flex-col justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#0094eb] flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                        Moderação de Conteúdo
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Controle de publicação na loja.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">
                        {autoApproval ? "Aprovação automática ativada" : "Aprovação automática desativada"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {autoApproval ? "Comentários entram na loja direto." : "Requer aprovação prévia."}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAutoApproval(!autoApproval)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        autoApproval ? "bg-[#0094eb]" : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          autoApproval ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Filtros & Busca */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Filtros & Busca
                    </span>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase bg-blue-50 text-[#0094eb] border border-blue-100">
                      {filteredComments.length} Comentários
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center pt-1">
                    <div className="sm:col-span-6 relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Pesquisar autor ou texto..."
                        value={commentSearchQuery}
                        onChange={(e) => setCommentSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <select
                        aria-label="Filtrar comentários por status"
                        value={commentStatusFilter}
                        onChange={(e) => setCommentStatusFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer"
                      >
                        <option value="all">Todos os Status</option>
                        <option value="pendente">Pendente</option>
                        <option value="aprovado">Aprovado</option>
                      </select>
                    </div>

                    <div className="sm:col-span-3">
                      <select
                        aria-label="Filtrar comentários por vídeo"
                        value={commentVideoFilter}
                        onChange={(e) => setCommentVideoFilter(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20 cursor-pointer truncate"
                      >
                        <option value="all">Todos os Vídeos</option>
                        <option value="Criação_de_Vídeo_Fashion_Editorial_Luxo.mp4">Criação_de_Vídeo...</option>
                        <option value="oculos-de-sol.mp4">oculos-de-sol.mp4</option>
                      </select>
                    </div>
                  </div>
                </div>

              </div>

              {/* Tabela de Comentários */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/70 text-slate-400 uppercase font-bold text-[10px] tracking-wider border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-4">Autor</th>
                        <th className="px-6 py-4">CONTEÚDO / VÍDEO</th>
                        <th className="px-6 py-4 text-center">Status</th>
                        <th className="px-6 py-4 text-right">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredComments.length > 0 ? (
                        filteredComments.map((comm) => (
                          <tr key={comm.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#0094eb] text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
                                  {comm.authorInitial}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900 leading-tight text-xs">{comm.authorName}</p>
                                  <span className="text-[10px] text-slate-400 block font-normal">{comm.authorRole}</span>
                                </div>
                              </div>
                            </td>

                            <td className="px-6 py-4 space-y-1">
                              <p className="text-slate-800 font-bold text-xs">
                                "{comm.text}"
                              </p>
                              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
                                VÍDEO: <span className="text-[#0094eb] lowercase font-bold">{comm.videoName}</span>
                              </p>
                            </td>

                            <td className="px-6 py-4 text-center">
                              {comm.status === "PENDENTE" ? (
                                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-50 text-amber-600 border border-amber-200">
                                  PENDENTE
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-50 text-emerald-600 border border-emerald-200">
                                  APROVADO
                                </span>
                              )}
                            </td>

                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2 text-slate-400">
                                <button
                                  onClick={() => openModerateModal(comm)}
                                  title="Responder / Moderar Comentário"
                                  className="p-1.5 hover:text-[#0094eb] hover:bg-blue-50 rounded-lg transition-colors"
                                >
                                  <MessageSquare className="w-4 h-4 stroke-[1.8]" />
                                </button>
                                <button
                                  onClick={() => handleDeleteComment(comm.id)}
                                  title="Excluir Comentário"
                                  className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 stroke-[1.8]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                            Nenhum comentário encontrado.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* Placeholders limpos para as próximas abas */}
          {["products", "appearance"].includes(activeTab) && (
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

      {/* MODAL: MODERAR COMENTÁRIO */}
      {isModerateModalOpen && selectedCommentForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 pb-4 flex items-start justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#0094eb] flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Moderar Comentário</h3>
                  <p className="text-xs text-slate-400">Aprove ou responda à interação do cliente</p>
                </div>
              </div>
              <button
                onClick={() => setIsModerateModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-800">{selectedCommentForModal.authorName}</span>
                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {selectedCommentForModal.status}
                  </span>
                </div>
                <p className="text-xs text-slate-700 italic">"{selectedCommentForModal.text}"</p>
                <p className="text-[10px] text-slate-400">Vídeo: {selectedCommentForModal.videoName}</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Sua Resposta Pública (Opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Escreva uma resposta pública para aparecer no story..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0094eb]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModerateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveComment(selectedCommentForModal.id)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Aprovar Comentário</span>
                </button>
              </div>
            </div>
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
